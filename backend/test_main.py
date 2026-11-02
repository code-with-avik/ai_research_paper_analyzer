import unittest
from datetime import timedelta
from unittest.mock import patch

import pymupdf
from langchain_core.runnables import RunnableLambda
from pydantic import ValidationError

import main
from main import (
    chat,
    create_report_pdf,
    download_report,
    extract_text_from_pdf,
    report_timestamp,
    retrieve_relevant_passages,
    split_text,
    verify_analysis_qa,
    ChatRequest,
)


class FakeStructuredLLM:
    def with_structured_output(self, _schema):
        return RunnableLambda(lambda _payload: {})


class PaperCoverageTests(unittest.TestCase):
    def test_chunking_covers_start_and_end_of_long_text(self):
        text = "START_MARKER\n\n" + ("Background paragraph about previous work.\n\n" * 500) + "\nEND_MARKER"
        chunks = split_text(text, max_chars=2_000, overlap=150)
        self.assertGreater(len(chunks), 1)
        joined = "\n".join(chunks)
        self.assertIn("START_MARKER", joined)
        self.assertIn("END_MARKER", joined)

    def test_follow_up_retrieval_finds_results_near_end(self):
        text = "[Page 1]\n" + ("Unrelated introduction and background. " * 400)
        text += "\n\n[Page 24]\nThe randomized controlled trial enrolled 487 participants and reduced mortality by 18 percent."
        passages = retrieve_relevant_passages(text, "How many participants were enrolled and what happened to mortality?")
        self.assertTrue(any("487 participants" in passage and "[Page 24]" in passage for passage in passages))

    def test_pdf_extraction_keeps_page_numbers(self):
        document = pymupdf.open()
        page = document.new_page()
        page.insert_text((50, 70), "A randomized study enrolled 487 participants.")
        pdf_bytes = document.tobytes()
        document.close()
        text = extract_text_from_pdf(pdf_bytes)
        self.assertIn("[Page 1]", text)
        self.assertIn("487 participants", text)

    def test_nonmatching_question_does_not_get_unrelated_context(self):
        self.assertEqual(retrieve_relevant_passages("This paper studies neural networks.", "why?"), [])

    def test_general_paper_question_gets_opening_and_conclusion_context(self):
        text = "[Page 1]\nINTRODUCTION_MARKER\n\n" + ("Background on this study. " * 500)
        text += "\n\n[Page 12]\nCONCLUSION_MARKER: the intervention improved the primary outcome."
        passages = retrieve_relevant_passages(text, "Can you summarize this paper?")
        joined = "\n".join(passages)
        self.assertIn("INTRODUCTION_MARKER", joined)
        self.assertIn("CONCLUSION_MARKER", joined)

    def test_broad_inside_question_gets_opening_and_conclusion(self):
        text = "[Page 1]\nThis paper introduces a new image classifier and compares it with prior models."
        text += "\n\n[Page 9]\nThe experiments show improved accuracy on the authors' benchmark."
        passages = retrieve_relevant_passages(text, "what is inside this paper?")
        joined = "\n".join(passages).lower()
        self.assertIn("introduces a new image classifier", joined)
        self.assertIn("improved accuracy", joined)

    def test_author_question_searches_opening_metadata(self):
        text = "[Page 1]\nMira Patel and Jordan Lee\n\nA paper about model robustness."
        text += "\n\n[Page 7]\nResults and conclusions."
        passages = retrieve_relevant_passages(text, "who is the author of this paper?")
        self.assertIn("Mira Patel", "\n".join(passages))

    def test_essential_qa_keeps_supported_answers_with_source_quotes(self):
        paper = "[Page 3]\nThe study enrolled 487 participants and reduced mortality by 18 percent."
        analysis = {"qa_pairs": [{"question": "What happened to mortality?", "answer": "Mortality decreased by 18 percent.", "category": "findings", "evidence_quote": "reduced mortality by 18 percent."}]}
        result = verify_analysis_qa(analysis, paper)
        pair = result["qa_pairs"][0]
        self.assertEqual(pair["answer"], "Mortality decreased by 18 percent.")
        self.assertEqual(pair["category"], "findings")
        self.assertTrue(pair["verified"])
        self.assertEqual(pair["evidence_page"], 3)

    def test_essential_qa_verifies_without_an_extra_model_request(self):
        analysis = {"qa_pairs": [{"question": "What methods were used?", "answer": "The study used an observational design.", "evidence_quote": "The authors used an observational design."}]}
        with patch("main.get_llm", side_effect=AssertionError("verification should not call the model")):
            result = verify_analysis_qa(analysis, "[Page 1]\nThe authors used an observational design.")
        pair = result["qa_pairs"][0]
        self.assertEqual(pair["answer"], "The study used an observational design.")
        self.assertTrue(pair["verified"])
        self.assertEqual(pair["evidence_page"], 1)

    def test_follow_up_answer_matches_uploaded_paper_and_page(self):
        paper = "[Page 8]\nThe study enrolled 487 participants and reduced mortality by 18 percent."
        response = {"answer": "Mortality fell by 18 percent among 487 participants.", "answer_status": "answered", "missing_information": "", "evidence": [{"quote": "reduced mortality by 18 percent", "page": 8}]}
        with patch("main.get_llm", return_value=FakeStructuredLLM()), patch("main._invoke_with_rate_limit", return_value=response):
            result = chat(ChatRequest(question="What happened to mortality?", paper_text=paper))
        self.assertEqual(result["answer"], response["answer"])
        self.assertTrue(result["verified"])
        self.assertEqual(result["evidence"][0]["page"], 8)

    def test_follow_up_uses_source_sentence_when_model_quote_is_invalid(self):
        paper = "[Page 8]\nThe study enrolled 487 participants and reduced mortality by 18 percent."
        response = {"answer": "Mortality was reduced by 18 percent in the study.", "answer_status": "answered", "evidence": [{"quote": "fabricated quotation not in source"}]}
        with patch("main.get_llm", return_value=FakeStructuredLLM()), patch("main._invoke_with_rate_limit", return_value=response):
            result = chat(ChatRequest(question="What happened to mortality?", paper_text=paper))
        self.assertTrue(result["verified"])
        self.assertIn("reduced mortality", result["evidence"][0]["quote"])

    def test_follow_up_without_matching_text_returns_specific_honest_answer(self):
        result = chat(ChatRequest(question="What does the paper say about Mars?", paper_text="[Page 1]\nThis paper studies neural networks."))
        self.assertFalse(result["verified"])
        self.assertIn("mars", result["answer"].lower())

    def test_empty_document_text_is_rejected(self):
        with self.assertRaises(ValidationError):
            ChatRequest(question="What is the paper about?", paper_text="")

    def test_pdf_timestamp_uses_india_standard_time(self):
        value, note = report_timestamp()
        self.assertEqual(value.utcoffset(), timedelta(hours=5, minutes=30))
        self.assertEqual(value.tzname(), "IST")
        self.assertIn("India Standard Time (IST, UTC+05:30)", note)

    def test_detailed_pdf_handles_long_unicode_content_and_toc(self):
        pdf = create_report_pdf({
            "title": "München — AI Research",
            "authors": ["Ana García"],
            "publication_date": "2024",
            "user_name": "Zoë",
            "abstract_summary": "café, naïve approach, and an en dash — in the summary. " * 180,
            "research_problem": "A clearly stated research problem.",
            "research_objectives": ["Objective one"],
            "methodology": "Methods described in the paper.",
            "dataset_experimental_setup": "A reported experimental setup.",
            "key_insights": ["Finding one"],
            "key_contributions": ["Contribution one"],
            "limitations": ["One author-stated limitation"],
            "future_research_directions": ["Future work stated by the authors"],
            "conclusion": "A paper-supported conclusion.",
            "references": ["García et al. (2024)"],
            "qa_pairs": [{"question": "Question?", "answer": "Answer.", "verified": True, "evidence_quote": "Exact evidence", "evidence_page": 2}],
            "chat_history": [{"sender": "user", "text": "Follow-up?"}, {"sender": "assistant", "text": "A checked answer.", "verified": True, "evidence": [{"quote": "Evidence quote", "page": 2}]}],
        })
        document = pymupdf.open(stream=pdf, filetype="pdf")
        self.assertGreater(document.page_count, 2)
        extracted = "\n".join(page.get_text() for page in document)
        self.assertIn("München", extracted)
        self.assertIn("Contents", extracted)
        self.assertIn("Essential Q&A", extracted)
        self.assertIn("Page 2", extracted)
        document.close()

    def test_report_endpoint_returns_pdf_content_and_safe_filename(self):
        response = download_report({"title": "Paper: Results", "abstract_summary": "A summary."})
        self.assertEqual(response.media_type, "application/pdf")
        self.assertIn("attachment;", response.headers["content-disposition"])
        self.assertIn("Paper_Results_Detailed_Report.pdf", response.headers["content-disposition"])
        self.assertIn("/api/download-report", {route.path for route in main.app.routes})
        self.assertIn("/api/download-pdf", {route.path for route in main.app.routes})


if __name__ == "__main__":
    unittest.main()
