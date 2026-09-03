import { Hono } from 'hono'
import type { Bindings } from '../types/env.js'
import { postChat, postChatStream } from '../controllers/chat.controller.js'

const router = new Hono<{ Bindings: Bindings }>()

router.post('/chat', postChat)
router.post('/chat/stream', postChatStream)

export default router
