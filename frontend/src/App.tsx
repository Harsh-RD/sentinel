import { useState, useEffect } from 'react'
import { api, authStorage, type UserSession } from './api'
import Dashboard from './Dashboard'
import Services from './Services'
import Monitors from './Monitors'
import Incidents from './Incidents'
import Maintenance from './Maintenance'
import StatusPage from './StatusPage'
import Operations from './Operations'

export default function App() {
  const [session, setSession] = useState<UserSession | null>(() => authStorage.get())
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [activeTab, setActiveTab] = useState('Dashboard')
  const [showPublicStatusOnly, setShowPublicStatusOnly] = useState(false)
  const [backendStatus, setBackendStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  const [currentTime, setCurrentTime] = useState<string>('')

  // Live UTC Clock
  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      setCurrentTime(now.toUTCString().replace('GMT', 'UTC'))
    }
    updateTime()
    const timer = setInterval(updateTime, 1000)
    return () => clearInterval(timer)
  }, [])

  // Health check ping
  useEffect(() => {
    const pingBackend = async () => {
      try {
        await api.checkHealth()
        setBackendStatus('online')
      } catch {
        setBackendStatus('offline')
      }
    }
    pingBackend()
    const pingTimer = setInterval(pingBackend, 15000)
    return () => clearInterval(pingTimer)
  }, [])

  const handleLogin = async (e?: React.FormEvent) => {
    if (e) e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const newSession = await api.login(email.trim(), password)
      setSession(newSession)
      setBackendStatus('online')
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials or backend server.')
    } finally {
      setLoading(false)
    }
  }

  const handleQuickFill = (demoEmail: string, demoPass: string) => {
    setEmail(demoEmail)
    setPassword(demoPass)
    setError('')
  }

  const handleLogout = () => {
    api.logout()
    setSession(null)
  }

  // Standalone Public Status Page View
  if (showPublicStatusOnly) {
    return <StatusPage onBackToConsole={() => setShowPublicStatusOnly(false)} />
  }

  // Logged-in NOC Console View
  if (session) {
    const tabs = [
      'Dashboard',
      'Services',
      'Monitors',
      'Incidents',
      'Maintenance',
      'Status Page',
      'Operations & Reports',
    ]

    return (
      <div className="window sentinel-console-window">
        {/* Title Bar */}
        <div className="title-bar">
          <div className="title-bar-text">
            <span>🛡️ Sentinel NOC Console — Mission Control [v1.0.0]</span>
          </div>
          <div className="title-bar-controls">
            <button aria-label="Minimize" title="Minimize Window"></button>
            <button aria-label="Maximize" title="Maximize Window"></button>
            <button aria-label="Close" onClick={handleLogout} title="Log Off Console"></button>
          </div>
        </div>

        {/* Menu Bar */}
        <div className="menu-bar">
          <div className="menu-item" onClick={() => api.downloadCsvReport()} title="Export CSV Report">
            <u>F</u>ile: Export CSV
          </div>
          <div className="menu-item" onClick={() => setActiveTab('Incidents')} title="Open Incident War Room">
            <u>A</u>ctions: War Room
          </div>
          <div className="menu-item" onClick={() => setActiveTab('Operations & Reports')} title="Placement Demo Guide">
            <u>H</u>elp: Demo Guide
          </div>
          <div className="menu-item" onClick={handleLogout} style={{ marginLeft: 'auto', color: '#800' }}>
            Log Off [{session.email}]
          </div>
        </div>

        {/* Window Body with Tabs */}
        <div className="window-body" style={{ padding: '8px 12px' }}>
          <menu role="tablist">
            {tabs.map((tab) => (
              <li role="tab" aria-selected={activeTab === tab} key={tab}>
                <a
                  href="#tabs"
                  onClick={(e) => {
                    e.preventDefault()
                    setActiveTab(tab)
                  }}
                >
                  {tab}
                </a>
              </li>
            ))}
          </menu>

          <div className="window" role="tabpanel" style={{ minHeight: '520px' }}>
            <div className="window-body" style={{ padding: '12px' }}>
              {activeTab === 'Dashboard' && (
                <Dashboard onNavigateTab={setActiveTab} userRole={session.role} />
              )}
              {activeTab === 'Services' && <Services userRole={session.role} />}
              {activeTab === 'Monitors' && <Monitors userRole={session.role} />}
              {activeTab === 'Incidents' && <Incidents userRole={session.role} />}
              {activeTab === 'Maintenance' && <Maintenance userRole={session.role} />}
              {activeTab === 'Status Page' && <StatusPage />}
              {activeTab === 'Operations & Reports' && (
                <Operations userRole={session.role} onNavigateTab={setActiveTab} />
              )}
            </div>
          </div>

          {/* Bottom Status Bar */}
          <div className="status-bar">
            <div className="status-bar-field" style={{ flex: 1 }}>
              <span className={`led-indicator ${backendStatus === 'online' ? 'led-green' : 'led-red'}`}></span>
              <span>
                Backend API:{' '}
                <strong>
                  {backendStatus === 'online'
                    ? 'CONNECTED (FastAPI :8000)'
                    : backendStatus === 'checking'
                    ? 'CHECKING...'
                    : 'OFFLINE / UNREACHABLE'}
                </strong>
              </span>
            </div>
            <div className="status-bar-field">
              Active User: <strong>{session.email}</strong> [
              <span style={{ textTransform: 'uppercase', color: '#000080' }}>{session.role}</span>]
            </div>
            <div className="status-bar-field" style={{ minWidth: '220px', textAlign: 'right' }}>
              🕒 {currentTime}
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Login Dialog
  return (
    <div style={{ width: '100%', maxWidth: '440px', marginTop: '6%' }}>
      <div className="window">
        <div className="title-bar">
          <div className="title-bar-text">
            <span>🛡️ Log on to Sentinel NOC</span>
          </div>
          <div className="title-bar-controls">
            <button aria-label="Close" onClick={() => setShowPublicStatusOnly(true)} title="View Public Status"></button>
          </div>
        </div>

        <div className="window-body" style={{ padding: '16px' }}>
          {error && (
            <div
              style={{
                background: '#fdd',
                border: '1px solid #c00',
                padding: '8px',
                marginBottom: '12px',
                fontSize: '12px',
                lineHeight: '1.4',
              }}
            >
              ⚠️ {error}
            </div>
          )}

          <div style={{ display: 'flex', gap: '14px', alignItems: 'center', marginBottom: '14px' }}>
            <div
              style={{
                fontSize: '32px',
                background: '#000080',
                color: '#fff',
                padding: '10px 14px',
                boxShadow: 'inset -2px -2px #000, inset 2px 2px #fff',
              }}
            >
              🔑
            </div>
            <div style={{ fontSize: '12px' }}>
              <strong>Sentinel API Reliability Platform</strong>
              <div style={{ color: '#555', marginTop: '2px' }}>
                Enter your credentials or choose a demo role below to access the mission control console.
              </div>
            </div>
          </div>

          {/* Quick Demo Fill Buttons */}
          <fieldset style={{ marginBottom: '14px', padding: '8px 10px' }}>
            <legend>Quick Demo Accounts (1-Click Fill)</legend>
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
              <button
                type="button"
                className="demo-chip"
                onClick={() => handleQuickFill('admin@local.test', 'admin')}
                title="Admin: Full provision & delete rights"
              >
                👑 Admin
              </button>
              <button
                type="button"
                className="demo-chip"
                onClick={() => handleQuickFill('operator@local.test', 'operator')}
                title="Operator: Probe testing, incidents & maintenance"
              >
                🛠️ Operator
              </button>
              <button
                type="button"
                className="demo-chip"
                onClick={() => handleQuickFill('viewer@local.test', 'viewer')}
                title="Viewer: Read-only telemetry"
              >
                👁️ Viewer
              </button>
            </div>
          </fieldset>

          <form onSubmit={handleLogin}>
            <div className="field-row-stacked" style={{ marginBottom: '10px' }}>
              <label htmlFor="login-email" style={{ fontSize: '12px' }}>Email Address:</label>
              <input
                id="login-email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="admin@local.test"
                required
                style={{ width: '100%' }}
              />
            </div>

            <div className="field-row-stacked" style={{ marginBottom: '14px' }}>
              <label htmlFor="login-password" style={{ fontSize: '12px' }}>Password:</label>
              <input
                id="login-password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••"
                required
                style={{ width: '100%' }}
              />
            </div>

            <section className="field-row" style={{ justifyContent: 'space-between', alignItems: 'center' }}>
              <button
                type="button"
                onClick={() => setShowPublicStatusOnly(true)}
                style={{ fontSize: '11px' }}
              >
                Public Status Page
              </button>
              <div style={{ display: 'flex', gap: '6px' }}>
                <button type="submit" disabled={loading} style={{ fontWeight: 'bold', minWidth: '70px' }}>
                  {loading ? 'Logging on...' : 'Log On'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setEmail('')
                    setPassword('')
                    setError('')
                  }}
                >
                  Cancel
                </button>
              </div>
            </section>
          </form>

          {/* Backend Connection Indicator on Login Screen */}
          <div
            style={{
              marginTop: '14px',
              paddingTop: '8px',
              borderTop: '1px solid #c0c0c0',
              fontSize: '11px',
              display: 'flex',
              justifyContent: 'space-between',
              color: '#555',
            }}
          >
            <span>
              API Status:{' '}
              <strong style={{ color: backendStatus === 'online' ? '#008000' : '#c00000' }}>
                {backendStatus === 'online' ? '● Online (127.0.0.1:8000)' : '● Unreachable'}
              </strong>
            </span>
            <span>Sentinel v1.0.0</span>
          </div>
        </div>
      </div>
    </div>
  )
}
