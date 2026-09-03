import { Hono } from 'hono'
import type { Bindings } from '../types/env.js'
import { getHealth } from '../controllers/health.controller.js'

const router = new Hono<{ Bindings: Bindings }>()

router.get('/health', getHealth)

export default router
