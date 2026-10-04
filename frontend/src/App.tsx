import { useState } from 'react'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [token, setToken] = useState<string | null>(null)
  const [error, setError] = useState('')

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
            <li role="tab" aria-selected="true"><a href="#tabs">Dashboard</a></li>
            <li role="tab"><a href="#tabs">Services</a></li>
            <li role="tab"><a href="#tabs">Monitors</a></li>
            <li role="tab"><a href="#tabs">Incidents</a></li>
            <li role="tab"><a href="#tabs">Status Page</a></li>
          </menu>
          <div className="window" role="tabpanel">
            <div className="window-body">
              <p>Welcome to Sentinel. You are authenticated.</p>
              <button onClick={() => setToken(null)}>Logout</button>
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
