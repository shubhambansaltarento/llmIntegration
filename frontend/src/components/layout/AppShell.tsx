import Sidebar from './Sidebar'
import Header from './Header'
import MessageList from '../chat/MessageList'
import ChatInput from '../chat/ChatInput'
import './layout.css'
import '../chat/chat.css'

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
    </div>
  )
}

export default AppShell
