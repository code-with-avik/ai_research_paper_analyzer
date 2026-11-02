import express from 'express'
import multer from 'multer'
import {
  askAboutPaper,
  summarizeUploadedPaper,
  uploadPaper
} from '../controllers/analyzerController.js'

const router = express.Router()
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 }
})

router.post('/papers/upload', upload.single('paper'), uploadPaper)
router.post('/papers/:paperId/summarize', summarizeUploadedPaper)
router.post('/papers/:paperId/ask', askAboutPaper)

export default router
