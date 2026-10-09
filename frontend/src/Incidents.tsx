import { useState, useEffect } from 'react'

export default function Incidents({ token }: { token: string }) {
  const [incidents, setIncidents] = useState<any[]>([])

  const fetchIncidents = () => {
    fetch('http://127.0.0.1:8000/api/incidents', { headers: { Authorization: `Bearer ${token}` } })
      .then(res => res.json())
      .then(data => setIncidents(data))
  }

  useEffect(() => {
    fetchIncidents()
  }, [])

  const handleAcknowledge = async (id: number) => {
    await fetch(`http://127.0.0.1:8000/api/incidents/${id}/acknowledge`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchIncidents()
  }

  const handleResolve = async (id: number) => {
    await fetch(`http://127.0.0.1:8000/api/incidents/${id}/resolve`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` }
    })
    fetchIncidents()
  }

  return (
    <div>
      <fieldset>
        <legend>Incidents</legend>
        <table style={{ width: '100%', textAlign: 'left' }}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Status</th>
              <th>Severity</th>
              <th>Created</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {incidents.map((inc: any) => (
              <tr key={inc.id}>
                <td>{inc.id}</td>
                <td>{inc.status}</td>
                <td>{inc.severity}</td>
                <td>{new Date(inc.created_at).toLocaleString()}</td>
                <td>
                  {inc.status === 'open' && <button onClick={() => handleAcknowledge(inc.id)}>Ack</button>}
                  {inc.status !== 'resolved' && <button onClick={() => handleResolve(inc.id)}>Resolve</button>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </fieldset>
    </div>
  )
}
