import { useState, useEffect } from 'react'
import { api, type AnalyticsStats, type IncidentItem } from './api'

interface DashboardProps {
  onNavigateTab?: (tab: string) => void
  userRole?: string
}

export default function Dashboard({ onNavigateTab, userRole }: DashboardProps) {
  const [stats, setStats] = useState<AnalyticsStats | null>(null)
  const [incidents, setIncidents] = useState<IncidentItem[]>([])
  const [loading, setLoading] = useState(true)
  const [simulating, setSimulating] = useState(false)
  const [lastRefreshed, setLastRefreshed] = useState<string>('')
  const [error, setError] = useState<string | null>(null)

  const loadData = async () => {
    try {
      setError(null)
      const [analyticsData, incidentData] = await Promise.all([
        api.getAnalytics(),
        api.getIncidents(),
      ])
      setStats(analyticsData)
      setIncidents(incidentData.slice(0, 5))
      setLastRefreshed(new Date().toLocaleTimeString())
    } catch (err: any) {
      setError(err.message || 'Failed to fetch dashboard telemetry')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
    const timer = setInterval(loadData, 10000)
    return () => clearInterval(timer)
  }, [])

  const handleSimulateOutage = async () => {
    setSimulating(true)
    try {
      await api.simulateOutage()
      await loadData()
      if (onNavigateTab) {
        onNavigateTab('Incidents')
      }
    } catch (err: any) {
      alert(`Simulation failed: ${err.message}`)
    } finally {
      setSimulating(false)
    }
  }

  const handleExportCsv = async () => {
    try {
      await api.downloadCsvReport()
    } catch (err: any) {
      alert(`Failed to download CSV: ${err.message}`)
    }
  }

  if (loading && !stats) {
    return (
      <div style={{ padding: '20px', textAlign: 'center' }}>
        <p>Loading Sentinel NOC Telemetry...</p>
      </div>
    )
  }

  const isDegraded = (stats?.open_incidents || 0) > 0 || (stats?.failure_rate_percentage || 0) > 0

  return (
    <div>
      {error && (
        <div style={{ background: '#fdd', border: '1px solid #c00', padding: '6px 10px', marginBottom: '12px', fontSize: '12px' }}>
          ⚠️ {error}
        </div>
      )}

      {/* System Health Banner */}
      <div className={`system-health-banner ${isDegraded ? 'banner-degraded' : 'banner-operational'}`}>
        <div>
          <span className={`led-indicator ${isDegraded ? 'led-red' : 'led-green'}`}></span>
          <span>
            {isDegraded
              ? `SYSTEM ALERT: ${stats?.open_incidents} OPEN INCIDENT(S) IN PROGRESS`
              : 'ALL SERVICES NOMINAL & OPERATIONAL (SLO 99.9% MET)'}
          </span>
        </div>
        <div style={{ fontSize: '11px', fontWeight: 'normal' }}>
          Auto-polling every 10s | Last updated: {lastRefreshed}
        </div>
      </div>

      {/* Action Toolbar */}
      <div className="action-toolbar">
        <div className="btn-group">
          {(userRole === 'admin' || userRole === 'operator') && (
            <button
              onClick={handleSimulateOutage}
              disabled={simulating}
              style={{ fontWeight: 'bold' }}
              title="Triggers an end-to-end incident test per PLAN.md demo flow"
            >
              {simulating ? 'Simulating...' : '⚡ Simulate Outage (Payments)'}
            </button>
          )}
          <button onClick={handleExportCsv}>📥 Export CSV Report</button>
          <button onClick={loadData}>🔄 Refresh Now</button>
        </div>
        <div style={{ fontSize: '11px', color: '#555' }}>
          NOC Mode: Active Monitoring
        </div>
      </div>

      {/* Metrics Group */}
      <fieldset style={{ marginBottom: '16px' }}>
        <legend>Telemetry & Availability Overview</legend>
        <div className="metrics-grid">
          <div className="metric-card">
            <div className="metric-label">Monitored Endpoints</div>
            <div className="metric-value">{stats?.total_monitors ?? 0}</div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Global Uptime</div>
            <div
              className="metric-value"
              style={{
                color: (stats?.uptime_percentage ?? 100) >= 99 ? 'green' : 'red',
              }}
            >
              {stats?.uptime_percentage ?? 100}%
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Average Latency</div>
            <div className="metric-value">{stats?.avg_latency_ms ?? 0} <span style={{ fontSize: '14px' }}>ms</span></div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Failure Rate</div>
            <div
              className="metric-value"
              style={{
                color: (stats?.failure_rate_percentage ?? 0) > 0 ? 'red' : 'black',
              }}
            >
              {stats?.failure_rate_percentage ?? 0}%
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Open Incidents</div>
            <div
              className="metric-value"
              style={{
                color: (stats?.open_incidents ?? 0) > 0 ? 'red' : 'green',
              }}
            >
              {stats?.open_incidents ?? 0}
            </div>
          </div>
          <div className="metric-card">
            <div className="metric-label">Total Incidents</div>
            <div className="metric-value">{stats?.total_incidents ?? 0}</div>
          </div>
        </div>
      </fieldset>

      {/* Recent Incidents Feed */}
      <fieldset>
        <legend>Active & Recent Incident Log</legend>
        {incidents.length === 0 ? (
          <p style={{ margin: '10px 0', fontSize: '12px', color: '#666' }}>
            No incidents on record. All systems stable.
          </p>
        ) : (
          <table className="sentinel-table" style={{ width: '100%' }}>
            <thead>
              <tr>
                <th style={{ width: '50px' }}>ID</th>
                <th>Summary</th>
                <th style={{ width: '100px' }}>Severity</th>
                <th style={{ width: '120px' }}>Status</th>
                <th style={{ width: '150px' }}>Detected At</th>
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => (
                <tr
                  key={inc.id}
                  style={{ cursor: 'pointer' }}
                  onClick={() => onNavigateTab && onNavigateTab('Incidents')}
                  title="Click to view details in Incidents tab"
                >
                  <td>#{inc.id}</td>
                  <td><strong>{inc.summary}</strong></td>
                  <td>
                    <span className={`badge ${inc.severity === 'critical' ? 'badge-down' : 'badge-warning'}`}>
                      {inc.severity}
                    </span>
                  </td>
                  <td>
                    <span
                      className={`badge ${
                        inc.status === 'open'
                          ? 'badge-down'
                          : inc.status === 'acknowledged'
                          ? 'badge-ack'
                          : 'badge-resolved'
                      }`}
                    >
                      {inc.status}
                    </span>
                  </td>
                  <td>{new Date(inc.created_at).toLocaleTimeString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </fieldset>
    </div>
  )
}
