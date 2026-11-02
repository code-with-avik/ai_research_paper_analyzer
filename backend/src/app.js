import cors from 'cors'
import express from 'express'
import analyzerRoutes from './routes/analyzerRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

app.use(
  cors({
    origin: process.env.FRONTEND_ORIGIN || '*'
  })
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', analyzerRoutes)
app.use(errorHandler)

export default app
