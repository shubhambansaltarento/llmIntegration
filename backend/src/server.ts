import express from 'express'
import type { ErrorRequestHandler } from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import chatRoutes from './routes/chat.routes.js'
import healthRoutes from './routes/health.routes.js'
import { HttpError, codeForStatus } from './utils/errors.js'

dotenv.config()

const app = express()
const port = process.env.PORT ?? 3000
const frontendOrigin = process.env.FRONTEND_ORIGIN ?? 'http://localhost:5173'

app.use(cors({ origin: frontendOrigin }))
app.use(express.json())

app.use('/api', chatRoutes)
app.use('/api', healthRoutes)

const errorHandler: ErrorRequestHandler = (err: unknown, _req, res, _next) => {
  if (err instanceof HttpError) {
    res.status(err.status).json({ error: err.message, code: codeForStatus(err.status) })
    return
  }

  console.error(err instanceof Error ? err.message : err)
  res.status(500).json({ error: 'Internal server error', code: codeForStatus(500) })
}

app.use(errorHandler)

app.listen(port, () => {
  console.log(`Server running on http://localhost:${port}`)
})
