import { Router } from 'express'
import { postChat, postChatStream } from '../controllers/chat.controller.js'

const router = Router()

router.post('/chat', postChat)
router.post('/chat/stream', postChatStream)

export default router
