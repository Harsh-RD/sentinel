import { useState, useEffect } from 'react'
import { api, type MaintenanceWindowItem, type ServiceItem } from './api'

interface MaintenanceProps {
  userRole?: string
}

export default function Maintenance({ userRole }: MaintenanceProps) {
  const [windows, setWindows] = useState<MaintenanceWindowItem[]>([])
  const [services, setServices] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [serviceId, setServiceId] = useState('')
  const [reason, setReason] = useState('')
  const [durationHours, setDurationHours] = useState('2')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)

  const loadData = async () => {
    try {
      setError(null)
      const [winData, svcData] = await Promise.all([
        api.getMaintenanceWindows(),
        api.getServices(),
      ])
      setWindows(winData)
      setServices(svcData)
      if (svcData.length > 0 && !serviceId) {
        setServiceId(String(svcData[0].id))
      }
    } catch (err: any) {
      setError(err.message || 'Failed to load maintenance windows')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadData()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!serviceId) return
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      const now = new Date()
      const end = new Date(now.getTime() + (parseFloat(durationHours) || 2) * 60 * 60 * 1000)
      await api.createMaintenanceWindow({
        service_id: parseInt(serviceId),
        reason: reason.trim(),
        start_time: now.toISOString(),
        end_time: end.toISOString(),
      })
      setSuccess('Maintenance window scheduled successfully!')
      setReason('')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to schedule maintenance window')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number) => {
    if (!window.confirm('Cancel this maintenance window?')) return
    try {
      await api.deleteMaintenanceWindow(id)
      setSuccess('Maintenance window removed.')
      await loadData()
    } catch (err: any) {
      setError(err.message || 'Failed to delete maintenance window')
    }
  }

  const canEdit = userRole === 'admin' || userRole === 'operator'

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

      <div style={{ background: '#fffae6', border: '1px solid #e0c060', padding: '8px 12px', marginBottom: '16px', fontSize: '12px' }}>
        ℹ️ <strong>Maintenance Policy:</strong> During an active maintenance window, probe health checks continue to be executed and persisted, but downstream alert dispatches (Slack/Pager/email) are suppressed without discarding SLA audit history.
      </div>

      {/* Windows Table */}
      <fieldset style={{ marginBottom: '16px' }}>
        <legend>Scheduled Maintenance Windows ({windows.length})</legend>
        {loading ? (
          <p style={{ padding: '10px' }}>Loading maintenance schedule...</p>
        ) : windows.length === 0 ? (
          <p style={{ padding: '10px', color: '#666' }}>No active or scheduled maintenance windows.</p>
        ) : (
          <table className="sentinel-table">
            <thead>
              <tr>
                <th style={{ width: '45px' }}>ID</th>
                <th>Service</th>
                <th>Reason</th>
                <th>Start Time</th>
                <th>End Time</th>
                <th style={{ width: '90px' }}>Status</th>
                {canEdit && <th style={{ width: '80px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {windows.map((w) => {
                const svc = services.find((s) => s.id === w.service_id)
                const now = new Date()
                const start = new Date(w.start_time)
                const end = new Date(w.end_time)
                const isActive = now >= start && now <= end
                const isExpired = now > end
                return (
                  <tr key={w.id}>
                    <td>#{w.id}</td>
                    <td>{svc ? svc.name : `Service #${w.service_id}`}</td>
                    <td><strong>{w.reason}</strong></td>
                    <td>{start.toLocaleString()}</td>
                    <td>{end.toLocaleString()}</td>
                    <td>
                      <span
                        className={`badge ${
                          isActive ? 'badge-warning' : isExpired ? 'badge-resolved' : 'badge-ack'
                        }`}
                      >
                        {isActive ? 'ACTIVE' : isExpired ? 'EXPIRED' : 'SCHEDULED'}
                      </span>
                    </td>
                    {canEdit && (
                      <td>
                        <button onClick={() => handleDelete(w.id)} style={{ color: '#900' }}>
                          Cancel
                        </button>
                      </td>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </fieldset>

      {/* Schedule Form */}
      <fieldset>
        <legend>Schedule Maintenance Window {canEdit ? '(Operator/Admin Access)' : '(Operator Role Required)'}</legend>
        {!canEdit ? (
          <p style={{ fontSize: '12px', color: '#555', fontStyle: 'italic', margin: '8px 0' }}>
            🔒 You are logged in with role <strong>{userRole || 'viewer'}</strong>. Scheduling maintenance windows requires Operator or Administrator privileges.
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
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="field-row" style={{ marginBottom: '8px' }}>
              <label style={{ width: '130px' }}>Reason:</label>
              <input
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g., PostgreSQL migration & schema rebuild"
                required
                style={{ flex: 1, maxWidth: '400px' }}
              />
            </div>
            <div className="field-row" style={{ marginBottom: '12px' }}>
              <label style={{ width: '130px' }}>Duration:</label>
              <select
                value={durationHours}
                onChange={(e) => setDurationHours(e.target.value)}
                style={{ width: '150px' }}
              >
                <option value="0.5">30 minutes</option>
                <option value="1">1 hour</option>
                <option value="2">2 hours</option>
                <option value="4">4 hours</option>
                <option value="8">8 hours</option>
                <option value="24">24 hours</option>
              </select>
              <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>
                Begins immediately upon submission
              </span>
            </div>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Scheduling...' : '+ Schedule Maintenance'}
            </button>
          </form>
        )}
      </fieldset>
    </div>
  )
}
