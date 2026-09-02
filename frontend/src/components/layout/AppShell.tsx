import Sidebar from './Sidebar'
import Header from './Header'
import MessageList from '../chat/MessageList'
import ChatInput from '../chat/ChatInput'
import { ToastViewport } from '../feedback/Toast'
import './layout.css'
import '../chat/chat.css'
import '../feedback/feedback.css'

function AppShell() {
  return (
    <div class="app-shell">
      <Sidebar />
      <div class="main-area">
        <Header />
        <div class="content">
          <MessageList />
        </div>
        <ChatInput />
      </div>
      <ToastViewport />
    </div>
  )
}

export default AppShell
