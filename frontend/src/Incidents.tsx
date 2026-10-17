import { useState, useEffect } from 'react'
import { api, type IncidentItem, type IncidentCommentItem, type ServiceItem } from './api'

interface IncidentsProps {
  userRole?: string
}

export default function Incidents({ userRole }: IncidentsProps) {
  const [incidents, setIncidents] = useState<IncidentItem[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedIncident, setSelectedIncident] = useState<IncidentItem | null>(null)
  const [comments, setComments] = useState<IncidentCommentItem[]>([])
  const [commentText, setCommentText] = useState('')
  const [loadingComments, setLoadingComments] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [simulating, setSimulating] = useState(false)

  const loadData = async () => {
    try {
      setError(null)
      const [incData, svcData] = await Promise.all([
        api.getIncidents(),
        api.getServices(),
      ])
      setIncidents(incData)
      setServices(svcData)
      if (selectedIncident) {
        const updated = incData.find((i) => i.id === selectedIncident.id)
        if (updated) setSelectedIncident(updated)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load incidents')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleSelectIncident = async (inc: IncidentItem) => {
    setSelectedIncident(inc)
    setLoadingComments(true)
    try {
      const cmts = await api.getIncidentComments(inc.id)
      setComments(cmts)
    } catch (err: any) {
      setError(`Failed to load comments: ${err.message}`)
    } finally {
      setLoadingComments(false)
    }
  }

  const handleAcknowledge = async (id: number) => {
    setError(null)
    try {
      const updated = await api.acknowledgeIncident(id)
      setSuccess(`Incident #${id} acknowledged.`)
      await loadData()
      if (selectedIncident?.id === id) setSelectedIncident(updated)
    } catch (err: any) {
      setError(err.message || 'Failed to acknowledge incident')
    }
  }

  const handleResolve = async (id: number) => {
    setError(null)
    try {
      const updated = await api.resolveIncident(id)
      setSuccess(`Incident #${id} resolved. MTTR recorded.`)
      await loadData()
      if (selectedIncident?.id === id) setSelectedIncident(updated)
    } catch (err: any) {
      setError(err.message || 'Failed to resolve incident')
    }
  }

  const handleAddComment = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedIncident || !commentText.trim()) return
    setError(null)
    try {
      await api.addIncidentComment(selectedIncident.id, commentText.trim())
      setCommentText('')
      const cmts = await api.getIncidentComments(selectedIncident.id)
      setComments(cmts)
      setSuccess('War-room comment logged.')
    } catch (err: any) {
      setError(err.message || 'Failed to add comment')
    }
  }

  const handleSimulateOutage = async () => {
    setSimulating(true)
    setError(null)
    try {
      const res = await api.simulateOutage()
      setSuccess(`${res.message} (Incident #${res.incident_id})`)
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to simulate outage')
    } finally {
      setSimulating(false)
    }
  }

  const canAction = userRole === 'admin' || userRole === 'operator'

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

      {/* Action Toolbar */}
      <div className="action-toolbar">
        <div className="btn-group">
          {canAction && (
            <button
              onClick={handleSimulateOutage}
              disabled={simulating}
              style={{ fontWeight: 'bold' }}
              title="Triggers an end-to-end incident test per PLAN.md demo flow"
            >
              {simulating ? 'Simulating...' : '⚡ Trigger Mock Outage'}
            </button>
          )}
          <button onClick={() => api.downloadCsvReport()}>📥 Download Incidents CSV</button>
          <button onClick={loadData}>🔄 Refresh Incidents</button>
        </div>
        <div style={{ fontSize: '11px', color: '#555' }}>
          Total Incidents: {incidents.length} | War-Room Real-Time Log
        </div>
      </div>

      {/* Incidents Table */}
      <fieldset style={{ marginBottom: '16px' }}>
        <legend>Incident Timeline & State Machine</legend>
        {loading ? (
          <p style={{ padding: '10px' }}>Loading incidents...</p>
        ) : incidents.length === 0 ? (
          <p style={{ padding: '10px', color: '#666' }}>
            No incidents recorded. All systems are operating normally.
          </p>
        ) : (
          <table className="sentinel-table">
            <thead>
              <tr>
                <th style={{ width: '45px' }}>ID</th>
                <th>Service</th>
                <th>Incident Summary</th>
                <th style={{ width: '90px' }}>Severity</th>
                <th style={{ width: '100px' }}>Status</th>
                <th style={{ width: '140px' }}>Created</th>
                <th style={{ width: '80px' }}>MTTA</th>
                <th style={{ width: '80px' }}>MTTR</th>
                {canAction && <th style={{ width: '140px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {incidents.map((inc) => {
                const svc = services.find((s) => s.id === inc.service_id)
                const isSelected = selectedIncident?.id === inc.id
                return (
                  <tr
                    key={inc.id}
                    onClick={() => handleSelectIncident(inc)}
                    style={{
                      cursor: 'pointer',
                      backgroundColor: isSelected ? '#000080' : undefined,
                      color: isSelected ? '#ffffff' : undefined,
                    }}
                    title="Click row to open War Room comments"
                  >
                    <td>#{inc.id}</td>
                    <td>{svc ? svc.name : `Service #${inc.service_id}`}</td>
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
                    <td>{inc.mtta_seconds ? `${Math.round(inc.mtta_seconds)}s` : '-'}</td>
                    <td>{inc.mttr_seconds ? `${Math.round(inc.mttr_seconds)}s` : '-'}</td>
                    {canAction && (
                      <td onClick={(e) => e.stopPropagation()}>
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {inc.status === 'open' && (
                            <button
                              onClick={() => handleAcknowledge(inc.id)}
                              style={{ fontWeight: 'bold' }}
                              title="Acknowledge incident (records MTTA)"
                            >
                              Ack
                            </button>
                          )}
                          {inc.status !== 'resolved' && (
                            <button
                              onClick={() => handleResolve(inc.id)}
                              style={{ color: '#008000', fontWeight: 'bold' }}
                              title="Resolve incident (records MTTR)"
                            >
                              Resolve
                            </button>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </fieldset>

      {/* War Room & Comments Panel */}
      {selectedIncident && (
        <fieldset style={{ background: '#f9f9f9' }}>
          <legend>
            War Room — Incident #{selectedIncident.id} ({selectedIncident.summary})
          </legend>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '12px', marginBottom: '8px' }}>
            <div>
              Status: <strong>{selectedIncident.status.toUpperCase()}</strong> | Severity:{' '}
              <strong>{selectedIncident.severity.toUpperCase()}</strong> | Created:{' '}
              {new Date(selectedIncident.created_at).toLocaleString()}
            </div>
            <div>
              {selectedIncident.acknowledged_at && (
                <span style={{ marginRight: '12px' }}>
                  Ack'd: {new Date(selectedIncident.acknowledged_at).toLocaleTimeString()}
                </span>
              )}
              {selectedIncident.resolved_at && (
                <span>
                  Resolved: {new Date(selectedIncident.resolved_at).toLocaleTimeString()}
                </span>
              )}
            </div>
          </div>

          {/* Comment Thread */}
          <div className="comments-container">
            {loadingComments ? (
              <p style={{ margin: '6px 0', fontSize: '11px' }}>Loading timeline notes...</p>
            ) : comments.length === 0 ? (
              <p style={{ margin: '6px 0', fontSize: '11px', color: '#666', fontStyle: 'italic' }}>
                No war room comments logged yet. Operators can post updates below.
              </p>
            ) : (
              comments.map((c) => (
                <div key={c.id} className="comment-entry">
                  <div className="comment-meta">
                    User #{c.user_id} • {new Date(c.created_at).toLocaleString()}
                  </div>
                  <div style={{ fontWeight: 500 }}>{c.text}</div>
                </div>
              ))
            )}
          </div>

          {/* Add Comment Form */}
          {canAction && (
            <form onSubmit={handleAddComment} style={{ marginTop: '10px', display: 'flex', gap: '8px' }}>
              <input
                type="text"
                value={commentText}
                onChange={(e) => setCommentText(e.target.value)}
                placeholder="Log an incident investigation note (e.g., Failover triggered)..."
                required
                style={{ flex: 1 }}
              />
              <button type="submit">+ Post Note</button>
            </form>
          )}
        </fieldset>
      )}
    </div>
  )
}
