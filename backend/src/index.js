import dotenv from 'dotenv'

dotenv.config()

const { default: app } = await import('./app.js')

const port = process.env.PORT || 4000

app.listen(port, () => {
  console.log(`Backend server running on http://localhost:${port}`)
})
