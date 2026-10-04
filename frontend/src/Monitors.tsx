import { useState, useEffect } from 'react'

export default function Monitors({ token }: { token: string }) {
  const [monitors, setMonitors] = useState<any[]>([])
  const [services, setServices] = useState<any[]>([])
  const [name, setName] = useState('')
  const [url, setUrl] = useState('')
  const [serviceId, setServiceId] = useState('')

  useEffect(() => {
    fetch('http://localhost:8000/api/monitors', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setMonitors(data) })
      
    fetch('http://localhost:8000/api/services', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => { if (Array.isArray(data)) setServices(data) })
  }, [token])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('http://localhost:8000/api/monitors', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ name, url, service_id: parseInt(serviceId), method: 'GET', interval_seconds: 60, timeout_seconds: 10 })
    })
    if (res.ok) {
      const newMonitor = await res.json()
      setMonitors([...monitors, newMonitor])
      setName('')
      setUrl('')
    } else {
      const err = await res.json()
      alert('Failed: ' + (err.detail || 'Unknown error'))
    }
  }

  const handleTest = async (id: number) => {
    const res = await fetch(`http://localhost:8000/api/monitors/${id}/test`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    if (res.ok) {
      const result = await res.json()
      alert(`Test Result:\nStatus: ${result.status_code}\nTime: ${result.response_time_ms}ms\nUp: ${result.is_up}`)
    } else {
      alert('Test failed (Forbidden?)')
    }
  }

  return (
    <div>
      <table className="interactive" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Service ID</th>
            <th>Name</th>
            <th>URL</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {monitors.map(m => (
            <tr key={m.id}>
              <td>{m.id}</td>
              <td>{m.service_id}</td>
              <td>{m.name}</td>
              <td>{m.url}</td>
              <td>
                <button onClick={() => handleTest(m.id)}>Test Now</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <fieldset style={{ marginTop: '20px' }}>
        <legend>Create Monitor (Admin/Operator)</legend>
        <form onSubmit={handleCreate}>
          <div className="field-row">
            <label style={{width: '80px'}}>Service:</label>
            <select value={serviceId} onChange={e => setServiceId(e.target.value)} required>
              <option value="">-- Select --</option>
              {services.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </div>
          <div className="field-row" style={{marginTop: '10px'}}>
            <label style={{width: '80px'}}>Name:</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="field-row" style={{marginTop: '10px'}}>
            <label style={{width: '80px'}}>URL:</label>
            <input type="text" value={url} onChange={e => setUrl(e.target.value)} required />
          </div>
          <button style={{marginTop: '10px'}} type="submit">Create</button>
        </form>
      </fieldset>
    </div>
  )
}
