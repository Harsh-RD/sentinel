import { useState } from 'react'
import Services from './Services'
import Monitors from './Monitors'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [activeTab, setActiveTab] = useState('Dashboard')

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    try {
      const res = await fetch('http://localhost:8000/api/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      })
      
      if (!res.ok) {
        throw new Error('Invalid credentials')
      }
      const data = await res.json()
      setToken(data.access_token)
    } catch (err: any) {
      setError(err.message)
    }
  }

  if (token) {
    return (
      <div className="window" style={{ width: '600px', margin: '0 auto', marginTop: '10%' }}>
        <div className="title-bar">
          <div className="title-bar-text">Sentinel NOC Console</div>
          <div className="title-bar-controls">
            <button aria-label="Minimize"></button>
            <button aria-label="Maximize"></button>
            <button aria-label="Close" onClick={() => setToken(null)}></button>
          </div>
        </div>
        <div className="window-body">
          <menu role="tablist">
            {['Dashboard', 'Services', 'Monitors', 'Incidents', 'Status Page'].map(tab => (
              <li role="tab" aria-selected={activeTab === tab} key={tab}>
                <a href="#tabs" onClick={(e) => { e.preventDefault(); setActiveTab(tab) }}>{tab}</a>
              </li>
            ))}
          </menu>
          <div className="window" role="tabpanel">
            <div className="window-body">
              {activeTab === 'Dashboard' && <p>Welcome to Sentinel. You are authenticated.</p>}
              {activeTab === 'Services' && <Services token={token} />}
              {activeTab === 'Monitors' && <Monitors token={token} />}
              {activeTab === 'Incidents' && <p>Incidents coming soon...</p>}
              {activeTab === 'Status Page' && <p>Status Page coming soon...</p>}
              <button onClick={() => setToken(null)} style={{marginTop: '20px'}}>Logout</button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="window" style={{ width: '300px', margin: '0 auto', marginTop: '20%' }}>
      <div className="title-bar">
        <div className="title-bar-text">Login - Sentinel</div>
        <div className="title-bar-controls">
          <button aria-label="Close"></button>
        </div>
      </div>
      <div className="window-body">
        {error && <p style={{ color: 'red' }}>{error}</p>}
        <form onSubmit={handleLogin}>
          <div className="field-row-stacked" style={{ width: '200px' }}>
            <label htmlFor="email">Email:</label>
            <input id="email" type="text" value={email} onChange={e => setEmail(e.target.value)} />
          </div>
          <div className="field-row-stacked" style={{ width: '200px', marginTop: '10px' }}>
            <label htmlFor="password">Password:</label>
            <input id="password" type="password" value={password} onChange={e => setPassword(e.target.value)} />
          </div>
          <section className="field-row" style={{ justifyContent: 'flex-end', marginTop: '15px' }}>
            <button type="submit">OK</button>
            <button type="button">Cancel</button>
          </section>
        </form>
      </div>
    </div>
  )
}

export default App
