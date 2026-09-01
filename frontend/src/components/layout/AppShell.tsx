import Sidebar from './Sidebar'
import Header from './Header'
import './layout.css'

function AppShell() {
  return (
    <div class="app-shell">
      <Sidebar />
      <div class="main-area">
        <Header />
        <div class="content">
          <p>Chat messages will appear here.</p>
        </div>
      </div>
    </div>
  )
}

export default AppShell
