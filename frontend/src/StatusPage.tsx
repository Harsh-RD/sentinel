import { useState, useEffect } from 'react'
import { api, type PublicStatusData } from './api'

interface StatusPageProps {
  onBackToConsole?: () => void
}

export default function StatusPage({ onBackToConsole }: StatusPageProps) {
  const [statusData, setStatusData] = useState<PublicStatusData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [lastCheck, setLastCheck] = useState<string>('')

  const loadStatus = async () => {
    try {
      setError(null)
      const data = await api.getPublicStatus()
      setStatusData(data)
      setLastCheck(new Date().toLocaleTimeString())
    } catch (err: any) {
      setError(err.message || 'Failed to fetch public status')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadStatus()
    const timer = setInterval(loadStatus, 15000)
    return () => clearInterval(timer)
  }, [])

  if (loading && !statusData) {
    return (
      <div style={{ maxWidth: '750px', margin: '40px auto', textAlign: 'center' }}>
        <p>Checking Sentinel Public Status...</p>
      </div>
    )
  }

  const isOperational =
    statusData?.global_status === 'All Systems Operational' ||
    statusData?.overall === 'All Systems Operational'

  return (
    <div style={{ maxWidth: '850px', margin: '0 auto', padding: '10px 0' }}>
      <div className="window">
        <div className="title-bar">
          <div className="title-bar-text">
            <span>🛡️ Sentinel Public System Status Bulletin</span>
          </div>
          {onBackToConsole && (
            <div className="title-bar-controls">
              <button aria-label="Close" onClick={onBackToConsole} title="Back to NOC Console"></button>
            </div>
          )}
        </div>

        <div className="window-body" style={{ padding: '16px' }}>
          {error && (
            <div style={{ background: '#fdd', border: '1px solid #c00', padding: '6px 10px', marginBottom: '12px', fontSize: '12px' }}>
              ⚠️ {error}
            </div>
          )}

          {/* Large Overall Status Header */}
          <div
            style={{
              padding: '16px',
              textAlign: 'center',
              backgroundColor: isOperational ? '#e8f8e8' : '#fdeaea',
              border: `2px solid ${isOperational ? '#008800' : '#cc0000'}`,
              marginBottom: '20px',
            }}
          >
            <h2
              style={{
                margin: '0 0 6px 0',
                color: isOperational ? '#006600' : '#b30000',
                fontSize: '22px',
                letterSpacing: '0.5px',
              }}
            >
              {statusData?.global_status || statusData?.overall || 'All Systems Operational'}
            </h2>
            <div style={{ fontSize: '12px', color: '#555' }}>
              Real-time automated status update • Last verified: {lastCheck}
            </div>
          </div>

          {/* Service Status Breakdown */}
          <fieldset style={{ marginBottom: '20px' }}>
            <legend>Services & Core Subsystems</legend>
            <table className="sentinel-table">
              <thead>
                <tr>
                  <th>Subsystem Name</th>
                  <th style={{ width: '160px', textAlign: 'right' }}>Current State</th>
                </tr>
              </thead>
              <tbody>
                {statusData?.services && statusData.services.length > 0 ? (
                  statusData.services.map((svc) => {
                    const isSvcOk = svc.status === 'Operational'
                    return (
                      <tr key={svc.id}>
                        <td>
                          <strong>{svc.name}</strong>
                        </td>
                        <td style={{ textAlign: 'right' }}>
                          <span className={`badge ${isSvcOk ? 'badge-up' : 'badge-down'}`}>
                            {isSvcOk ? '● OPERATIONAL' : '● DEGRADED / OUTAGE'}
                          </span>
                        </td>
                      </tr>
                    )
                  })
                ) : (
                  <tr>
                    <td colSpan={2} style={{ color: '#666' }}>No active services configured.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </fieldset>

          {/* Incident Timeline */}
          <fieldset>
            <legend>Incident History & Announcements (Last 10)</legend>
            {statusData?.recent_incidents && statusData.recent_incidents.length > 0 ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '6px' }}>
                {statusData.recent_incidents.map((inc) => (
                  <div
                    key={inc.id}
                    style={{
                      border: '1px solid #c0c0c0',
                      padding: '8px 12px',
                      background: '#fafafa',
                      fontSize: '12px',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '4px' }}>
                      <span style={{ fontWeight: 'bold' }}>
                        {inc.summary || `Incident #${inc.id}`}
                      </span>
                      <span
                        className={`badge ${
                          inc.status === 'open'
                            ? 'badge-down'
                            : inc.status === 'acknowledged'
                            ? 'badge-ack'
                            : 'badge-resolved'
                        }`}
                      >
                        {inc.status.toUpperCase()}
                      </span>
                    </div>
                    <div style={{ color: '#666', fontSize: '11px' }}>
                      Detected: {new Date(inc.created_at).toLocaleString()}
                      {inc.resolved_at && ` • Resolved: ${new Date(inc.resolved_at).toLocaleString()}`}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p style={{ margin: '8px 0', fontSize: '12px', color: '#555' }}>
                ✓ No active or recent service interruptions reported in the past 24 hours.
              </p>
            )}
          </fieldset>

          {/* Footer Controls */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '16px' }}>
            <button onClick={loadStatus}>🔄 Refresh Status</button>
            {onBackToConsole && (
              <button onClick={onBackToConsole} style={{ fontWeight: 'bold' }}>
                ⬅ Return to Sentinel NOC Console
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
