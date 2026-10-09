import { useState, useEffect } from 'react'

export default function StatusPage() {
  const [statusData, setStatusData] = useState<any>(null)

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/status')
      .then(res => res.json())
      .then(data => setStatusData(data))
  }, [])

  if (!statusData) return <p>Loading system status...</p>

  return (
    <div style={{ maxWidth: '800px', margin: '0 auto', paddingTop: '40px' }}>
      <div className="window">
        <div className="title-bar">
          <div className="title-bar-text">Sentinel Public Status Page</div>
        </div>
        <div className="window-body">
          <h2 style={{ color: statusData.global_status === 'All Systems Operational' ? 'green' : 'red' }}>
            {statusData.global_status}
          </h2>
          
          <fieldset style={{ marginTop: '20px' }}>
            <legend>Services</legend>
            <table style={{ width: '100%', textAlign: 'left' }}>
              <tbody>
                {statusData.services.map((svc: any) => (
                  <tr key={svc.id}>
                    <td><strong>{svc.name}</strong></td>
                    <td style={{ color: svc.status === 'Operational' ? 'green' : (svc.status === 'Degraded' ? 'orange' : 'red') }}>
                      {svc.status}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </fieldset>
          
          <fieldset style={{ marginTop: '20px' }}>
            <legend>Recent Incidents</legend>
            <ul>
              {statusData.recent_incidents.map((inc: any) => (
                <li key={inc.id}>
                  <strong>{inc.status.toUpperCase()}</strong> - {new Date(inc.created_at).toLocaleString()}
                </li>
              ))}
              {statusData.recent_incidents.length === 0 && <li>No recent incidents.</li>}
            </ul>
          </fieldset>
        </div>
      </div>
    </div>
  )
}
