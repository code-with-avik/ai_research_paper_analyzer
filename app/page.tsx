"use client";

import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpRight,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronRight,
  CircleHelp,
  Clock3,
  FileCheck2,
  FileText,
  History,
  FlaskConical,
  Layers3,
  LoaderCircle,
  Menu,
  MessageCircle,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";

type TabId = "summary" | "insights" | "methodology" | "qa";
type Analysis = {
  title?: string;
  authors?: string[];
  publication_date?: string;
  research_problem?: string;
  research_objectives?: string[];
  background_motivation?: string;
  abstract_summary?: string;
  key_insights?: string[];
  key_contributions?: string[];
  methodology?: string;
  dataset_experimental_setup?: string;
  limitations?: string[];
  future_research_directions?: string[];
  conclusion?: string;
  references?: string[];
  qa_pairs?: { question: string; answer: string; category?: string; verified?: boolean; verification_note?: string; evidence_quote?: string; evidence_page?: number | null }[];
  paper_text?: string;
  extraction_notice?: string;
};
type ChatMessage = { sender: "user" | "assistant"; text: string; error?: boolean; verified?: boolean; evidence?: { quote: string; page?: number | null }[] };
type SavedChat = { id: string; title: string; updatedAt: number; analysis: Analysis; messages: ChatMessage[] };

const MAX_FILE_SIZE = 100 * 1024 * 1024;
const apiBase = (process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");
const tabs: { id: TabId; label: string; icon: typeof Layers3 }[] = [
  { id: "summary", label: "Executive summary", icon: Layers3 },
  { id: "insights", label: "Key insights", icon: Sparkles },
  { id: "methodology", label: "Method & limitations", icon: FlaskConical },
  { id: "qa", label: "Essential Q&A", icon: CircleHelp },
];

function formatSize(bytes: number) {
  return bytes < 1024 * 1024 ? `${Math.max(1, Math.round(bytes / 1024))} KB` : `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function renderAnswer(text: string) {
  return text.split(/(\*\*[^*]+\*\*)/g).map((part, index) =>
    part.startsWith("**") && part.endsWith("**")
      ? <strong key={index}>{part.slice(2, -2)}</strong>
      : part,
  );
}

async function responseError(response: Response, fallback: string) {
  const data = await response.json().catch(() => null);
  const detail = typeof data?.detail === "string" ? data.detail.slice(0, 320) : "";
  return new Error(detail || fallback);
}

function requestError(reason: unknown, fallback: string) {
  if (reason instanceof TypeError) {
    return new Error(`Cannot connect to the backend at ${apiBase}. Make sure the API is running at this address, then try again. See README.md for setup steps.`);
  }
  return reason instanceof Error ? reason : new Error(fallback);
}

export default function ResearchAnalyzerApp() {
  const [file, setFile] = useState<File | null>(null);
  const [analysis, setAnalysis] = useState<Analysis | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>("summary");
  const [loading, setLoading] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [includeConversation, setIncludeConversation] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [dragging, setDragging] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [chatLoading, setChatLoading] = useState(false);
  const [userName, setUserName] = useState("");
  const [chatHistory, setChatHistory] = useState<SavedChat[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);
  const conversationRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setUserName(window.localStorage.getItem("paperwise-user-name") || "");
    try {
      const saved = JSON.parse(window.localStorage.getItem("paperwise-chat-history") || "[]");
      if (Array.isArray(saved)) setChatHistory(saved.slice(0, 10));
    } catch { window.localStorage.removeItem("paperwise-chat-history"); }
  }, []);

  useEffect(() => {
    if (!analysis || !activeHistoryId || chatMessages.length === 0) return;
    const { paper_text: _paperText, ...savedAnalysis } = analysis;
    const savedChat: SavedChat = { id: activeHistoryId, title: analysis.title || file?.name || "Research conversation", updatedAt: Date.now(), analysis: savedAnalysis, messages: chatMessages };
    setChatHistory((previous) => {
      const updated = [savedChat, ...previous.filter((item) => item.id !== activeHistoryId)].slice(0, 10);
      try { window.localStorage.setItem("paperwise-chat-history", JSON.stringify(updated)); } catch { /* Keep the live chat working if browser storage is full. */ }
      return updated;
    });
  }, [analysis, activeHistoryId, chatMessages, file]);

  const selectFile = (selected: File | undefined) => {
    if (!selected) return;
    setError("");
    setNotice("");
    const looksLikePdf = selected.type === "application/pdf" || selected.name.toLowerCase().endsWith(".pdf");
    if (!looksLikePdf) {
      setError("That file doesn’t look like a PDF. Choose a .pdf file to continue.");
      return;
    }
    if (selected.size > MAX_FILE_SIZE) {
      setError("This PDF is over the 100 MB limit. Choose a smaller file.");
      return;
    }
    setFile(selected);
    setAnalysis(null);
    setChatMessages([]);
    setActiveHistoryId("");
    setActiveTab("summary");
  };

  const removeFile = () => {
    setFile(null);
    setAnalysis(null);
    setError("");
    setNotice("");
    setChatMessages([]);
    if (inputRef.current) inputRef.current.value = "";
  };

  const analyzePaper = async () => {
    if (!file || loading) return;
    setLoading(true);
    setError("");
    setNotice("");
    setAnalysis(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const response = await fetch(`${apiBase}/api/analyze-pdf`, { method: "POST", body: form });
      if (!response.ok) throw await responseError(response, "We couldn’t analyze this paper.");
      const result: Analysis = await response.json();
      setAnalysis(result);
      setActiveHistoryId(crypto.randomUUID());
      setNotice([result.extraction_notice, "Analysis is ready. Explore the sections or ask this paper a question."].filter(Boolean).join(" "));
      setChatMessages([{ sender: "assistant", text: "Your paper is ready. Ask a question about its methods, findings, or limitations." }]);
      setActiveTab("qa");
    } catch (reason) {
      setError(requestError(reason, "Couldn’t analyze this paper.").message);
    } finally {
      setLoading(false);
    }
  };

  const downloadReport = async () => {
    if (!analysis || downloading) return;
    setDownloading(true);
    setError("");
    try {
      const { paper_text: _paperText, ...reportAnalysis } = analysis;
      const response = await fetch(`${apiBase}/api/download-report`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...reportAnalysis, user_name: userName.trim(), include_conversation: includeConversation, chat_history: includeConversation ? chatMessages : [] }),
      });
      if (!response.ok) throw await responseError(response, "The summary PDF couldn’t be generated.");
      const contentType = response.headers.get("content-type") || "";
      if (!contentType.toLowerCase().includes("application/pdf")) {
        throw new Error("The server returned an invalid report response. Restart the backend and try again.");
      }
      const pdfBlob = await response.blob();
      if (pdfBlob.size < 500 || (await pdfBlob.slice(0, 5).text()) !== "%PDF-") {
        throw new Error("The report was empty or invalid, so it was not downloaded. Please try again.");
      }
      const url = URL.createObjectURL(pdfBlob);
      const link = document.createElement("a");
      link.href = url;
      const safeTitle = (analysis.title || "Research_Paper").replace(/[<>:"/\\|?*\x00-\x1F]/g, "").trim().replace(/\s+/g, "_").slice(0, 80) || "Research_Paper";
      link.download = `${safeTitle}_Detailed_Report.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
      setNotice("Your summary PDF has been downloaded.");
    } catch (reason) {
      setError(requestError(reason, "The summary PDF couldn’t be generated.").message);
    } finally {
      setDownloading(false);
    }
  };

  const askPaper = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const text = question.trim();
    if (!text || !analysis?.paper_text || chatLoading) return;
    setQuestion("");
    setChatMessages((messages) => [...messages, { sender: "user", text }]);
    setChatLoading(true);
    try {
      const response = await fetch(`${apiBase}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question: text,
          paper_text: analysis.paper_text,
          history: chatMessages.filter((message) => !message.error).slice(-20).map((message) => ({ role: message.sender, content: message.text })),
        }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data?.detail || "Couldn’t answer that question.");
      setChatMessages((messages) => [...messages, { sender: "assistant", text: data.answer, verified: Boolean(data.verified), evidence: Array.isArray(data.evidence) ? data.evidence : [] }]);
    } catch (reason) {
      setChatMessages((messages) => [...messages, { sender: "assistant", text: requestError(reason, "Couldn’t answer that question.").message, error: true }]);
    } finally {
      setChatLoading(false);
      window.setTimeout(() => {
        const conversation = conversationRef.current;
        if (conversation) conversation.scrollTo({ top: conversation.scrollHeight, behavior: "smooth" });
      }, 50);
    }
  };

  const saveName = (value: string) => {
    setUserName(value);
    window.localStorage.setItem("paperwise-user-name", value);
  };

  const openSavedChat = (saved: SavedChat) => {
    const savedAnalysis: Analysis = {
      ...saved.analysis,
      qa_pairs: saved.analysis.qa_pairs?.map((pair) => pair.verified === undefined ? {
        ...pair,
        answer: "This saved Q&A predates source verification and cannot be checked from the stored history. Re-upload the paper to ask again.",
        verified: false,
        evidence_quote: "",
      } : pair),
    };
    const savedMessages = saved.messages.map((message) => message.sender === "assistant" && message.verified === undefined && message.text !== "Your paper is ready. Ask a question about its methods, findings, or limitations."
      ? { ...message, text: "This saved answer predates source verification and cannot be checked from the stored history. Re-upload the paper and ask again.", verified: false, evidence: [] }
      : message);
    setAnalysis(savedAnalysis);
    setFile(null);
    setChatMessages(savedMessages);
    setActiveHistoryId(saved.id);
    setActiveTab("summary");
    setMobileMenuOpen(false);
    setNotice("Opened a saved conversation. Re-upload its paper to ask more questions.");
    document.getElementById("workspace")?.scrollIntoView({ behavior: "smooth" });
  };

  const openPicker = () => inputRef.current?.click();
  const tabNav = (mobile = false) => (
    <nav aria-label="Analysis sections" className="space-y-1">
      <p className="eyebrow px-3 pb-2 pt-5">Your analysis</p>
      {tabs.map(({ id, label, icon: Icon }) => {
        const active = activeTab === id;
        return (
          <button key={id} onClick={() => { setActiveTab(id); setMobileMenuOpen(false); }} disabled={!analysis}
            className={`side-link ${active && analysis ? "side-link-active" : ""} ${!analysis ? "side-link-disabled" : ""}`}>
            <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
            {id === "insights" && analysis?.key_insights?.length ? <span className="side-count">{analysis.key_insights.length}</span> : null}
          </button>
        );
      })}
      <p className="eyebrow px-3 pb-2 pt-5">History <span className="history-count">{chatHistory.length}/10</span></p>
      {chatHistory.length ? <div className="history-list">{chatHistory.map((saved) => <button key={saved.id} type="button" onClick={() => openSavedChat(saved)} className={`history-item ${activeHistoryId === saved.id ? "history-item-active" : ""}`} title={saved.title}><History size={15} /><span>{saved.messages.find((message) => message.sender === "user")?.text || saved.title}</span></button>)}</div> : <p className="history-empty">Your recent paper conversations will appear here.</p>}
      {analysis && file && <div className="mt-5 rounded-xl border border-slate-200/80 bg-white p-3.5">
        <div className="flex items-center gap-2 text-xs font-semibold text-slate-500"><FileCheck2 size={15} className="text-indigo-500" /> Current paper</div>
        <p className="mt-2 line-clamp-2 break-words text-sm font-semibold leading-5 text-slate-800">{analysis.title || file.name}</p>
        <p className="mt-1 text-xs text-slate-500">{formatSize(file.size)} · PDF</p>
      </div>}
      {mobile && <div className="mt-6 rounded-xl bg-indigo-50/80 p-3.5 text-xs leading-5 text-indigo-900"><ShieldCheck size={16} className="mb-1 text-indigo-600" />Your paper is processed for analysis. Ask questions grounded in its text.</div>}
    </nav>
  );

  return (
    <main className="app-shell min-h-screen text-slate-900">
      <aside className="sidebar hidden lg:flex">
        <a href="#workspace" className="brand-lockup" aria-label="AI Research Paper Analyzer home">
          <span className="brand-mark"><BookOpen size={20} strokeWidth={2.1} /></span>
          <span className="brand-name">paper<span>wise</span><small>AI RESEARCH PAPER ANALYZER</small></span>
        </a>
        <div className="sidebar-rule" />
        <p className="eyebrow px-3 pb-2">Workspace</p>
        <a href="#workspace" className="side-link side-link-active"><Layers3 size={17} strokeWidth={1.8} /><span>Paper analyzer</span></a>
        {tabNav()}
        <div className="sidebar-bottom">
          <div className="sidebar-note"><span className="note-icon"><ShieldCheck size={16} /></span><div><strong>Private by design</strong><p>Your documents stay in this session.</p></div></div>
          <span className="sidebar-version">AI Research Paper Analyzer <span>·</span> Workspace</span>
        </div>
      </aside>

      {mobileMenuOpen && <div className="mobile-overlay lg:hidden" onClick={() => setMobileMenuOpen(false)} />}
      <aside className={`mobile-drawer lg:hidden ${mobileMenuOpen ? "mobile-drawer-open" : ""}`} aria-hidden={!mobileMenuOpen}>
        <div className="flex items-center justify-between"><div className="brand-lockup"><span className="brand-mark"><BookOpen size={20} /></span><span className="brand-name">paper<span>wise</span><small>AI RESEARCH PAPER ANALYZER</small></span></div><button className="icon-button" aria-label="Close menu" onClick={() => setMobileMenuOpen(false)}><X size={20} /></button></div>
        <div className="sidebar-rule" /><a href="#workspace" className="side-link side-link-active" onClick={() => setMobileMenuOpen(false)}><Layers3 size={17} /><span>Paper analyzer</span></a>
        {tabNav(true)}
      </aside>

      <section id="workspace" className="main-column min-w-0 flex-1">
        <header className="topbar">
          <div className="flex min-w-0 items-center gap-3">
            <button className="icon-button lg:hidden" aria-label="Open navigation" onClick={() => setMobileMenuOpen(true)}><Menu size={20} /></button>
            <div className="breadcrumbs"><span>Workspace</span><ChevronRight size={14} /><strong>Paper analyzer</strong></div>
          </div>
          <div className="topbar-status"><span className="status-dot" /> <span>{loading ? "Analyzing paper" : analysis ? "Analysis ready" : "Ready to analyze"}</span><span className="topbar-divider" /><span className="powered-by"><Sparkles size={14} /> AI-powered</span></div>
        </header>

        <div className="workspace-content">
          <div className="page-heading">
            <div><div className="heading-kicker"><span className="kicker-line" /> YOUR RESEARCH, CLARIFIED</div>
              <h1>Understand research.<br className="sm:hidden" /> <span>Faster.</span></h1>
              <p>Turn dense papers into clear, actionable insights.</p>
            </div>
            {analysis && <div className="report-download-controls"><label className="report-conversation-option"><input type="checkbox" checked={includeConversation} onChange={(event) => setIncludeConversation(event.target.checked)} />Include chat in report</label><button onClick={downloadReport} disabled={downloading} className="button button-secondary heading-download"><ArrowDownToLine size={17} />{downloading ? "Preparing PDF…" : "Download summary"}</button></div>}
          </div>

          <section className="profile-card" aria-label="Report personalization"><div><div className="section-overline">REPORT PERSONALIZATION</div><p>Add your name to include it on downloaded reports.</p></div><label className="sr-only" htmlFor="user-name">Your name</label><input id="user-name" value={userName} onChange={(event) => saveName(event.target.value)} placeholder="Your name (optional)" autoComplete="name" /></section>

          <section className={`upload-card ${dragging ? "upload-card-dragging" : ""}`} aria-labelledby="upload-heading"
            onDragOver={(event) => { event.preventDefault(); setDragging(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
            onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files[0]); }}>
            <input ref={inputRef} type="file" accept="application/pdf,.pdf" className="sr-only" aria-label="Choose a research paper PDF" onChange={(event) => { selectFile(event.target.files?.[0]); event.target.value = ""; }} />
            <div className="upload-card-top"><div><div className="section-overline">START WITH A PAPER</div><h2 id="upload-heading">Bring your research into focus</h2><p>Upload a paper and let AI do the heavy reading.</p></div><div className="upload-step"><span>01</span><span className="step-line" /><span className={analysis ? "step-complete" : loading ? "step-current" : ""}>{analysis ? "✓" : "02"}</span></div></div>
            <div className={`dropzone ${file ? "dropzone-selected" : ""}`}>
              <div className="dropzone-icon">{loading ? <LoaderCircle className="animate-spin" size={23} /> : file ? <FileCheck2 size={23} /> : <UploadCloud size={23} />}</div>
              <div className="dropzone-copy">
                {file ? <><strong className="break-all">{file.name}</strong><span>{formatSize(file.size)} <span className="inline-dot">·</span> PDF document {analysis ? <span className="ready-chip"><Check size={12} /> Analyzed</span> : loading ? <span className="working-chip"><LoaderCircle size={12} className="animate-spin" /> Analyzing</span> : null}</span></> : <><strong>{dragging ? "Drop your paper here" : "Drag your paper here"}</strong><span>or choose a PDF from your device</span></>}
              </div>
              <div className="dropzone-actions">
                {file && <button type="button" className="text-button text-button-muted" onClick={removeFile} disabled={loading}>Remove</button>}
                <button type="button" onClick={openPicker} disabled={loading} className="button button-outline"><FileText size={16} />{file ? "Replace PDF" : "Browse files"}</button>
              </div>
            </div>
            <div className="upload-footer"><span><CheckCircle2 size={15} /> PDF only</span><span><CheckCircle2 size={15} /> Up to 100 MB</span><span><ShieldCheck size={15} /> Secure processing</span>
              <button type="button" onClick={analyzePaper} disabled={!file || loading} className="button button-primary analyze-button">{loading ? <><LoaderCircle className="animate-spin" size={17} /> Reading your paper…</> : analysis ? <><Check size={17} /> Analysis complete</> : <>Analyze paper <ArrowUpRight size={17} /></>}</button>
            </div>
            {loading && <div className="loading-track" aria-label="Analysis in progress"><span /></div>}
            {error && <div className="feedback feedback-error" role="alert"><AlertCircle size={17} /><span>{error}</span><button onClick={() => setError("")} aria-label="Dismiss error"><X size={16} /></button></div>}
            {notice && <div className="feedback feedback-success" role="status"><CheckCircle2 size={17} /><span>{notice}</span><button onClick={() => setNotice("")} aria-label="Dismiss message"><X size={16} /></button></div>}
          </section>

          {loading ? <section className="results-card" aria-label="Analysis loading"><div className="skeleton-heading" /><div className="skeleton-line skeleton-wide" /><div className="skeleton-line" /><div className="skeleton-line skeleton-short" /><div className="skeleton-block" /><p className="loading-caption"><LoaderCircle className="animate-spin" size={16} />Reading the paper in sections. Longer papers may take a few minutes…</p></section> : analysis ? (
            <section className="results-card" aria-labelledby="results-title">
              <div className="results-header"><div className="min-w-0"><div className="result-label"><span className="result-spark"><Sparkles size={14} /></span> PAPER ANALYSIS <span className="result-separator">/</span> {tabs.find((tab) => tab.id === activeTab)?.label.toUpperCase()}</div><h2 id="results-title" className="break-words">{analysis.title || file?.name || "Research paper analysis"}</h2></div>
                <button onClick={downloadReport} disabled={downloading} className="button button-secondary results-download"><ArrowDownToLine size={16} />{downloading ? "Preparing…" : "Download Detailed Report"}</button></div>
              <div className="analysis-tabs" role="tablist" aria-label="Paper analysis sections">{tabs.map(({ id, label, icon: Icon }) => <button key={id} id={`tab-${id}`} type="button" role="tab" aria-selected={activeTab === id} aria-controls={`panel-${id}`} onClick={() => setActiveTab(id)} className={`analysis-tab ${activeTab === id ? "analysis-tab-active" : ""}`}><Icon size={16} strokeWidth={1.9} /><span>{label}</span>{id === "insights" && analysis.key_insights?.length ? <span className="tab-count">{analysis.key_insights.length}</span> : id === "qa" && analysis.qa_pairs?.length ? <span className="tab-count">{analysis.qa_pairs.length}</span> : null}</button>)}</div>
              <div className="analysis-content" id={`panel-${activeTab}`} role="tabpanel" aria-labelledby={`tab-${activeTab}`} key={activeTab}>
                {activeTab === "summary" && <div className="prose-panel"><div className="content-label"><span className="content-marker marker-indigo" />THE BIG PICTURE</div>{analysis.abstract_summary ? <p className="summary-copy">{analysis.abstract_summary}</p> : <EmptySection text="No executive summary was returned for this paper." />}</div>}
                {activeTab === "insights" && <div className="prose-panel"><div className="content-label"><span className="content-marker marker-cyan" />WHAT MATTERS</div>{analysis.key_insights?.length ? <ol className="insight-list">{analysis.key_insights.map((item, index) => <li key={`${index}-${item}`}><span className="insight-number">{String(index + 1).padStart(2, "0")}</span><span>{item}</span></li>)}</ol> : <EmptySection text="No key insights were returned for this paper." />}</div>}
                {activeTab === "methodology" && <div className="method-grid"><article className="method-block"><div className="content-label"><span className="content-marker marker-indigo" />APPROACH</div>{analysis.methodology ? <p>{analysis.methodology}</p> : <EmptySection text="No methodology details were returned." />}</article><article className="method-block limitation-block"><div className="content-label"><span className="content-marker marker-amber" />LIMITATIONS & GAPS</div>{analysis.limitations?.length ? <ul className="limitation-list">{analysis.limitations.map((item, index) => <li key={`${index}-${item}`}><AlertCircle size={16} /><span>{item}</span></li>)}</ul> : <EmptySection text="No limitations were returned for this paper." />}</article></div>}
                {activeTab === "qa" && <div className="prose-panel"><div className="content-label"><span className="content-marker marker-cyan" />PREPARED STUDY Q&A · {analysis.qa_pairs?.length || 0} QUESTIONS</div>{analysis.qa_pairs?.length ? <><p className="qa-intro">A ready-to-review set of questions and answers prepared from this paper. Answers are checked against the source, with a page reference when available.</p><div className="qa-list">{analysis.qa_pairs.map((pair, index) => <article className="qa-item" key={`${index}-${pair.question}`}><span className="qa-index">{String(index + 1).padStart(2, "0")}</span><div className="qa-card-content">{pair.category && <span className="qa-category">{pair.category}</span>}<h3><span>Question</span>{pair.question}</h3><div className="qa-answer"><span>Answer</span><p>{pair.answer}</p></div>{typeof pair.verified === "boolean" && <span className={`qa-verified ${pair.verified ? "qa-verified-ok" : "qa-verified-muted"}`}><ShieldCheck size={13} />{pair.verified ? "Verified against source" : "Needs source review"}</span>}{pair.evidence_quote && <blockquote className="qa-source">“{pair.evidence_quote}”<cite>{pair.evidence_page ? `Page ${pair.evidence_page}` : "Uploaded paper"}</cite></blockquote>}{pair.verification_note && <p className="qa-verification-note">{pair.verification_note}</p>}</div></article>)}</div></> : <EmptySection text="No prepared Q&A was returned for this paper. Re-analyze the PDF to prepare a set from its text." />}</div>}
              </div>
              <div className="document-strip"><span className="document-strip-icon"><FileText size={16} /></span><div className="min-w-0"><strong className="truncate">{file?.name || analysis.title || "Research paper"}</strong><span>{file ? `${formatSize(file.size)} · PDF` : "Analysis source document"}</span></div><span className="document-strip-ready"><CheckCircle2 size={15} /> In this session</span></div>
            </section>
          ) : <section className="welcome-card"><div className="welcome-illustration"><div className="illustration-sheet"><span /><span /><span /><span /><span /></div><div className="illustration-spark"><Sparkles size={19} /></div><div className="illustration-check"><Check size={15} /></div></div><div className="welcome-copy"><div className="section-overline">A CLEARER WAY TO READ</div><h2>Your next breakthrough<br className="hidden sm:block" /> starts with understanding.</h2><p>Get to the signal in every paper. Explore a concise summary, research insights, methods, and thoughtful answers grounded in the text.</p></div><div className="welcome-features"><div><span className="feature-icon feature-violet"><Layers3 size={17} /></span><span><strong>Structured insights</strong><small>Key findings, made clear</small></span></div><div><span className="feature-icon feature-teal"><MessageCircle size={17} /></span><span><strong>Ask this paper</strong><small>Answers from your source</small></span></div><div><span className="feature-icon feature-amber"><ArrowDownToLine size={17} /></span><span><strong>Ready to share</strong><small>Download a polished report</small></span></div></div></section>}

          {analysis && <section className="ask-card" aria-labelledby="ask-title"><div className="ask-header"><div className="ask-icon"><MessageCircle size={19} /></div><div><div className="section-overline">GROUNDED IN YOUR DOCUMENT</div><h2 id="ask-title">Ask this paper</h2><p>{analysis.paper_text ? "Get an evidence-checked answer from the uploaded research." : "Re-upload the paper to continue asking questions."}</p></div><span className="ask-source"><span className="status-dot" /> {analysis.paper_text ? "Paper connected" : "Paper required"}</span></div>
            <div ref={conversationRef} className="conversation" aria-live="polite">{chatMessages.map((message, index) => <div key={`${index}-${message.sender}`} className={`chat-row ${message.sender === "user" ? "chat-row-user" : ""}`}><span className={`chat-avatar ${message.sender === "user" ? "chat-avatar-user" : ""}`}>{message.sender === "user" ? (userName.trim()[0]?.toUpperCase() || "Y") : <Sparkles size={14} />}</span><div className={`chat-bubble ${message.sender === "user" ? "chat-bubble-user" : ""} ${message.error ? "chat-bubble-error" : ""}`}>{message.sender === "assistant" ? <>{renderAnswer(message.text)}{typeof message.verified === "boolean" && <div className={`answer-verification ${message.verified ? "answer-verification-ok" : "answer-verification-muted"}`}><ShieldCheck size={13} />{message.verified ? "Source quote checked" : "Could not verify from the paper"}</div>}{message.evidence?.length ? <details className="answer-evidence"><summary>View source evidence ({message.evidence.length})</summary>{message.evidence.map((item, evidenceIndex) => <blockquote key={`${evidenceIndex}-${item.quote}`}>{item.quote}{item.page ? <cite>Page {item.page}</cite> : <cite>Source: uploaded paper</cite>}</blockquote>)}</details> : null}</> : message.text}</div></div>)}{chatLoading && <div className="chat-row"><span className="chat-avatar"><Sparkles size={14} /></span><div className="chat-bubble chat-thinking"><LoaderCircle size={15} className="animate-spin" />Checking relevant passages in your paper…</div></div>}<div ref={chatEndRef} /></div>
            {!chatMessages.some((message) => message.sender === "user") && analysis.paper_text && <div className="question-suggestions" aria-label="Suggested paper questions"><span>Try asking</span>{["What is inside this paper?", "Who are the authors?", "What are the main findings?"].map((suggestion) => <button key={suggestion} type="button" onClick={() => { setQuestion(suggestion); document.getElementById("paper-question")?.focus(); }}>{suggestion}</button>)}</div>}
            {!analysis.paper_text && <p className="context-warning"><AlertCircle size={15} />This saved conversation does not include the PDF text. Re-upload the paper to ask more questions.</p>}
            <form className="question-form" onSubmit={askPaper}><label htmlFor="paper-question" className="sr-only">Ask a question about this paper</label><textarea id="paper-question" rows={1} value={question} onChange={(event) => setQuestion(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Ask about the methods, results, or limitations…" disabled={!analysis.paper_text || chatLoading} /><button type="submit" aria-label="Send question" disabled={!question.trim() || !analysis.paper_text || chatLoading} className="send-button"><ArrowUpRight size={18} /></button></form><div className="ask-footnote"><span><ShieldCheck size={14} />Answers stay grounded in this paper</span><span>Enter to send <i>·</i> Shift + Enter for a new line</span></div>
          </section>}

          <footer className="page-footer"><span><Clock3 size={14} />Thoughtful research, without the busywork.</span><span>Built for curious minds <span className="footer-star">✳</span></span></footer>
        </div>
      </section>
    </main>
  );
}

function EmptySection({ text }: { text: string }) {
  return <div className="empty-section"><FileText size={18} /><span>{text}</span></div>;
}
