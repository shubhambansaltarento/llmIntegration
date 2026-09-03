import { Hono } from 'hono'
import { cors } from 'hono/cors'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import type { Bindings } from './types/env.js'
import chatRoutes from './routes/chat.routes.js'
import healthRoutes from './routes/health.routes.js'
import { HttpError, codeForStatus } from './utils/errors.js'

const app = new Hono<{ Bindings: Bindings }>()

app.use(
  '/api/*',
  cors({
    origin: (_origin, c) => c.env.FRONTEND_ORIGIN ?? 'http://localhost:5173',
  }),
)

app.route('/api', healthRoutes)
app.route('/api', chatRoutes)

app.onError((err, c) => {
  if (err instanceof HttpError) {
    return c.json(
      { error: err.message, code: codeForStatus(err.status) },
      err.status as ContentfulStatusCode,
    )
  }

  console.error(err instanceof Error ? err.message : err)
  return c.json({ error: 'Internal server error', code: codeForStatus(500) }, 500)
})

export default app
