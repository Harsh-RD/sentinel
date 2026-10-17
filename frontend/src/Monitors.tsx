import { useState, useEffect } from 'react'
import { api, type MonitorItem, type ServiceItem, type CheckResultItem } from './api'

interface MonitorsProps {
  userRole?: string
}

export default function Monitors({ userRole }: MonitorsProps) {
  const [monitors, setMonitors] = useState<MonitorItem[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [serviceId, setServiceId] = useState('')
  const [method, setMethod] = useState('GET')
  const [interval, setInterval] = useState('60')
  const [failureThreshold, setFailureThreshold] = useState('2')
  const [submitting, setSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  // Testing & History State
  const [testingId, setTestingId] = useState<number | null>(null)
  const [lastTestResult, setLastTestResult] = useState<{
    monitorId: number
    status_code: number | null
    response_time_ms: number | null
    is_up: boolean
    error_message: string | null
  } | null>(null)

  const [historyMonitorId, setHistoryMonitorId] = useState<number | null>(null)
  const [historyChecks, setHistoryChecks] = useState<CheckResultItem[]>([])
  const [loadingHistory, setLoadingHistory] = useState(false)

  const loadData = async () => {
    try {
      setError(null)
      const [monData, svcData] = await Promise.all([
        api.getMonitors(),
        api.getServices(),
      ])
      setMonitors(monData)
      setServices(svcData)
      if (svcData.length > 0 && !serviceId) {
        setServiceId(String(svcData[0].id))
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load monitors telemetry')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      await api.createMonitor({
        name: name.trim(),
        url: url.trim(),
        service_id: parseInt(serviceId),
        method,
        interval_seconds: parseInt(interval) || 60,
        timeout_seconds: 10,
        failure_threshold: parseInt(failureThreshold) || 3,
      })
      setSuccess(`Monitor "${name}" configured successfully!`)
      setName('')
      setUrl('')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to create monitor')
    } finally {
      setSubmitting(false)
    }
  }

  const handleTestNow = async (id: number) => {
    setTestingId(id)
    setError(null)
    try {
      const result = await api.testMonitor(id)
      setLastTestResult({
        monitorId: id,
        ...result,
      })
      await loadData()
    } catch (err: any) {
      setError(`Test check failed: ${err.message}`)
    } finally {
      setTestingId(null)
    }
  }

  const handleViewHistory = async (id: number) => {
    setHistoryMonitorId(id)
    setLoadingHistory(true)
    try {
      const checks = await api.getMonitorChecks(id, 15)
      setHistoryChecks(checks)
    } catch (err: any) {
      setError(`Failed to fetch history: ${err.message}`)
    } finally {
      setLoadingHistory(false)
    }
  }

  const handleDelete = async (id: number, monitorName: string) => {
    if (!window.confirm(`Delete monitor "${monitorName}"?`)) return
    try {
      await api.deleteMonitor(id)
      setSuccess(`Monitor "${monitorName}" deleted.`)
      if (historyMonitorId === id) setHistoryMonitorId(null)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to delete monitor')
    }
  }

  const canEdit = userRole === 'admin' || userRole === 'operator'
  const isAdmin = userRole === 'admin'

  return (
    <div>
      {error && (
        <div style={{ background: '#fdd', border: '1px solid #c00', padding: '6px 10px', marginBottom: '12px', fontSize: '12px' }}>
          ⚠️ {error}
        </div>
      )}
      {success && (
        <div style={{ background: '#dfd', border: '1px solid #0a0', padding: '6px 10px', marginBottom: '12px', fontSize: '12px' }}>
          ✓ {success}
        </div>
      )}

      {/* Test Result Toast/Banner */}
      {lastTestResult && (
        <div
          style={{
            background: lastTestResult.is_up ? '#e6ffe6' : '#ffe6e6',
            border: `1px solid ${lastTestResult.is_up ? '#00aa00' : '#cc0000'}`,
            padding: '8px 12px',
            marginBottom: '12px',
            fontSize: '12px',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
          }}
        >
          <div>
            <strong>Latest Test Result for Monitor #{lastTestResult.monitorId}:</strong>{' '}
            <span className={`badge ${lastTestResult.is_up ? 'badge-up' : 'badge-down'}`}>
              {lastTestResult.is_up ? '200 OK (UP)' : 'FAILED (DOWN)'}
            </span>{' '}
            | Status Code: <strong>{lastTestResult.status_code ?? 'None'}</strong> | Response Time:{' '}
            <strong>{lastTestResult.response_time_ms ?? 'N/A'} ms</strong>
            {lastTestResult.error_message && (
              <span style={{ color: '#c00', marginLeft: '6px' }}>({lastTestResult.error_message})</span>
            )}
          </div>
          <button onClick={() => setLastTestResult(null)} style={{ fontSize: '10px' }}>✕ Dismiss</button>
        </div>
      )}

      <div className="action-toolbar">
        <div>
          <button onClick={loadData}>🔄 Refresh Monitors</button>
        </div>
        <div style={{ fontSize: '11px', color: '#555' }}>
          Active Endpoints: {monitors.length} | Protected by SSRF Gateway Filter
        </div>
      </div>

      {/* Monitors List */}
      <fieldset style={{ marginBottom: '16px' }}>
        <legend>Configured Monitors ({monitors.length})</legend>
        {loading ? (
          <p style={{ padding: '10px' }}>Loading monitors...</p>
        ) : monitors.length === 0 ? (
          <p style={{ padding: '10px', color: '#666' }}>
            No monitors configured yet. Add one below to begin probe telemetry.
          </p>
        ) : (
          <table className="sentinel-table">
            <thead>
              <tr>
                <th style={{ width: '45px' }}>ID</th>
                <th>Monitor Name</th>
                <th>Service</th>
                <th>Target URL</th>
                <th style={{ width: '60px' }}>Method</th>
                <th style={{ width: '60px' }}>Interval</th>
                <th style={{ width: '80px' }}>Failures</th>
                <th style={{ width: '190px' }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {monitors.map((m) => {
                const svc = services.find((s) => s.id === m.service_id)
                return (
                  <tr key={m.id}>
                    <td>#{m.id}</td>
                    <td><strong>{m.name}</strong></td>
                    <td>{svc ? svc.name : `Service #${m.service_id}`}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: '11px' }}>{m.url}</td>
                    <td><span className="badge" style={{ background: '#e0e0e0', color: '#000' }}>{m.method}</span></td>
                    <td>{m.interval_seconds}s</td>
                    <td>
                      {m.consecutive_failures > 0 ? (
                        <span className="badge badge-down">{m.consecutive_failures} fails</span>
                      ) : (
                        <span className="badge badge-up">0 fails</span>
                      )}
                    </td>
                    <td>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        {canEdit && (
                          <button
                            onClick={() => handleTestNow(m.id)}
                            disabled={testingId === m.id}
                            title="Execute probe check immediately"
                          >
                            {testingId === m.id ? 'Testing...' : '⚡ Test Now'}
                          </button>
                        )}
                        <button
                          onClick={() => handleViewHistory(m.id)}
                          title="View probe history logs"
                        >
                          📜 Logs
                        </button>
                        {isAdmin && (
                          <button
                            onClick={() => handleDelete(m.id, m.name)}
                            style={{ color: '#900' }}
                            title="Delete this monitor"
                          >
                            🗑
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </fieldset>

      {/* Probe History Drawer */}
      {historyMonitorId && (
        <fieldset style={{ marginBottom: '16px', background: '#f5f5f5' }}>
          <legend>Probe Check History for Monitor #{historyMonitorId}</legend>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', fontWeight: 'bold' }}>Last 15 Execution Records:</span>
            <button onClick={() => setHistoryMonitorId(null)}>Close History</button>
          </div>
          {loadingHistory ? (
            <p style={{ padding: '8px' }}>Fetching check logs...</p>
          ) : historyChecks.length === 0 ? (
            <p style={{ padding: '8px', color: '#666' }}>No probe history recorded yet.</p>
          ) : (
            <table className="sentinel-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Status</th>
                  <th>HTTP Code</th>
                  <th>Latency</th>
                  <th>Details / Error</th>
                </tr>
              </thead>
              <tbody>
                {historyChecks.map((chk) => (
                  <tr key={chk.id}>
                    <td>{new Date(chk.timestamp).toLocaleTimeString()}</td>
                    <td>
                      <span className={`badge ${chk.is_up ? 'badge-up' : 'badge-down'}`}>
                        {chk.is_up ? 'UP' : 'DOWN'}
                      </span>
                    </td>
                    <td>{chk.status_code ?? 'None'}</td>
                    <td>{chk.response_time_ms ? `${chk.response_time_ms} ms` : 'N/A'}</td>
                    <td>{chk.error_message || 'OK'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </fieldset>
      )}

      {/* Create Monitor Form */}
      <fieldset>
        <legend>Create New Monitor {canEdit ? '(Operator/Admin Access)' : '(Operator Role Required)'}</legend>
        {!canEdit ? (
          <p style={{ fontSize: '12px', color: '#555', fontStyle: 'italic', margin: '8px 0' }}>
            🔒 You are logged in with role <strong>{userRole || 'viewer'}</strong>. Only Operators and Administrators can configure probe monitors.
          </p>
        ) : (
          <form onSubmit={handleCreate}>
            <div className="field-row" style={{ marginBottom: '8px' }}>
              <label style={{ width: '130px' }}>Target Service:</label>
              <select
                value={serviceId}
                onChange={(e) => setServiceId(e.target.value)}
                required
                style={{ width: '250px' }}
              >
                {services.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name} (SLO {(s.slo_target * 100).toFixed(1)}%)
                  </option>
                ))}
              </select>
            </div>
            <div className="field-row" style={{ marginBottom: '8px' }}>
              <label style={{ width: '130px' }}>Monitor Name:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Status Probe"
                required
                style={{ width: '250px' }}
              />
            </div>
            <div className="field-row" style={{ marginBottom: '8px' }}>
              <label style={{ width: '130px' }}>Probe URL:</label>
              <input
                type="text"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://httpbin.org/status/200"
                required
                style={{ flex: 1, maxWidth: '400px' }}
              />
            </div>

            {/* Quick Test Presets */}
            <div style={{ marginLeft: '130px', marginBottom: '8px', fontSize: '11px' }}>
              <span style={{ color: '#555' }}>Demo Presets: </span>
              <button
                type="button"
                className="demo-chip"
                onClick={() => {
                  setUrl('https://httpbin.org/status/200')
                  setName('Healthy HTTP 200 Probe')
                }}
              >
                + HTTP 200 (Healthy)
              </button>
              <button
                type="button"
                className="demo-chip"
                onClick={() => {
                  setUrl('https://httpbin.org/status/503')
                  setName('Failing HTTP 503 Probe')
                }}
              >
                + HTTP 503 (Outage Test)
              </button>
            </div>

            <div className="field-row" style={{ marginBottom: '12px' }}>
              <label style={{ width: '130px' }}>Method & Interval:</label>
              <select value={method} onChange={(e) => setMethod(e.target.value)} style={{ width: '80px', marginRight: '8px' }}>
                <option value="GET">GET</option>
                <option value="POST">POST</option>
                <option value="HEAD">HEAD</option>
              </select>
              <span style={{ fontSize: '12px', marginRight: '6px' }}>Interval:</span>
              <input
                type="number"
                min="10"
                max="3600"
                value={interval}
                onChange={(e) => setInterval(e.target.value)}
                style={{ width: '70px', marginRight: '6px' }}
              />
              <span style={{ fontSize: '11px', color: '#666', marginRight: '16px' }}>seconds</span>

              <span style={{ fontSize: '12px', marginRight: '6px' }}>Failure Threshold:</span>
              <input
                type="number"
                min="1"
                max="10"
                value={failureThreshold}
                onChange={(e) => setFailureThreshold(e.target.value)}
                style={{ width: '60px' }}
              />
            </div>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Configuring...' : '+ Create Probe Monitor'}
            </button>
          </form>
        )}
      </fieldset>
    </div>
  )
}
