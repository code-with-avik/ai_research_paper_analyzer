import cors from 'cors'
import express from 'express'
import analyzerRoutes from './routes/analyzerRoutes.js'
import { errorHandler } from './middleware/errorHandler.js'

const app = express()

const allowedOrigins = (process.env.FRONTEND_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((origin) => origin.trim())
  .filter((origin) => origin && origin !== '*')

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true)
        return
      }

      callback(new Error('Origin is not allowed by CORS.'))
    }
  })
)
app.use(express.json())

app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok' })
})

app.use('/api', analyzerRoutes)
app.use(errorHandler)

export default app
