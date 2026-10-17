import { useState, useEffect } from 'react'
import { api, type ServiceItem } from './api'

interface ServicesProps {
  userRole?: string
}

export default function Services({ userRole }: ServicesProps) {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [loading, setLoading] = useState(true)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [sloTarget, setSloTarget] = useState('99.9')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [submitting, setSubmitting] = useState(false)
  const [search, setSearch] = useState('')

  const loadServices = async () => {
    try {
      setError(null)
      const data = await api.getServices()
      setServices(data)
    } catch (err: any) {
      setError(err.message || 'Failed to load services')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadServices()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    setSubmitting(true)
    try {
      const targetVal = parseFloat(sloTarget) / 100
      await api.createService({
        name: name.trim(),
        description: description.trim() || undefined,
        slo_target: isNaN(targetVal) ? 0.999 : targetVal,
      })
      setSuccess(`Service "${name}" added successfully!`)
      setName('')
      setDescription('')
      setSloTarget('99.9')
      await loadServices()
    } catch (err: any) {
      setError(err.message || 'Failed to create service')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async (id: number, serviceName: string) => {
    if (!window.confirm(`Are you sure you want to delete service "${serviceName}" and all associated monitors?`)) {
      return
    }
    setError(null)
    try {
      await api.deleteService(id)
      setSuccess(`Service "${serviceName}" deleted.`)
      await loadServices()
    } catch (err: any) {
      setError(err.message || 'Failed to delete service')
    }
  }

  const filtered = services.filter(
    (s) =>
      s.name.toLowerCase().includes(search.toLowerCase()) ||
      (s.description && s.description.toLowerCase().includes(search.toLowerCase()))
  )

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

      <div className="action-toolbar">
        <div className="field-row" style={{ alignItems: 'center' }}>
          <label htmlFor="svc-search" style={{ fontSize: '12px' }}>Search Catalog:</label>
          <input
            id="svc-search"
            type="text"
            placeholder="Filter by name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{ width: '200px' }}
          />
        </div>
        <button onClick={loadServices}>🔄 Refresh Services</button>
      </div>

      <fieldset style={{ marginBottom: '16px' }}>
        <legend>Registered Service Catalog ({services.length})</legend>
        {loading ? (
          <p style={{ padding: '10px' }}>Loading catalog...</p>
        ) : filtered.length === 0 ? (
          <p style={{ padding: '10px', color: '#666' }}>No matching services found.</p>
        ) : (
          <table className="sentinel-table">
            <thead>
              <tr>
                <th style={{ width: '60px' }}>ID</th>
                <th>Service Name</th>
                <th>Description</th>
                <th style={{ width: '120px' }}>SLO Target</th>
                <th style={{ width: '160px' }}>Created</th>
                {isAdmin && <th style={{ width: '90px' }}>Actions</th>}
              </tr>
            </thead>
            <tbody>
              {filtered.map((s) => (
                <tr key={s.id}>
                  <td>#{s.id}</td>
                  <td><strong>{s.name}</strong></td>
                  <td>{s.description || <span style={{ color: '#888' }}>No description</span>}</td>
                  <td>
                    <span className="badge badge-up" style={{ background: '#006600' }}>
                      {(s.slo_target * 100).toFixed(2)}%
                    </span>
                  </td>
                  <td>{new Date(s.created_at).toLocaleDateString()}</td>
                  {isAdmin && (
                    <td>
                      <button
                        onClick={() => handleDelete(s.id, s.name)}
                        style={{ color: '#900', fontWeight: 'bold' }}
                      >
                        🗑 Delete
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </fieldset>

      <fieldset>
        <legend>Add Service to Catalog {isAdmin ? '(Admin Access)' : '(Admin Role Required)'}</legend>
        {!isAdmin ? (
          <p style={{ fontSize: '12px', color: '#555', fontStyle: 'italic', margin: '8px 0' }}>
            🔒 You are logged in with role <strong>{userRole || 'viewer'}</strong>. Service catalog provisioning is restricted to Administrators.
          </p>
        ) : (
          <form onSubmit={handleCreate}>
            <div className="field-row" style={{ marginBottom: '8px' }}>
              <label style={{ width: '120px' }}>Service Name:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Billing Gateway"
                required
                style={{ flex: 1, maxWidth: '400px' }}
              />
            </div>
            <div className="field-row" style={{ marginBottom: '8px' }}>
              <label style={{ width: '120px' }}>Description:</label>
              <input
                type="text"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Brief description of service purpose"
                style={{ flex: 1, maxWidth: '400px' }}
              />
            </div>
            <div className="field-row" style={{ marginBottom: '12px' }}>
              <label style={{ width: '120px' }}>SLO Target (%):</label>
              <input
                type="number"
                step="0.01"
                min="90"
                max="100"
                value={sloTarget}
                onChange={(e) => setSloTarget(e.target.value)}
                style={{ width: '100px' }}
                required
              />
              <span style={{ fontSize: '11px', color: '#666', marginLeft: '8px' }}>
                Standard target: 99.9%
              </span>
            </div>
            <button type="submit" disabled={submitting}>
              {submitting ? 'Registering...' : '+ Register New Service'}
            </button>
          </form>
        )}
      </fieldset>
    </div>
  )
}
