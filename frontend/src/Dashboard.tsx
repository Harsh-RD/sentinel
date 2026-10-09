import { useState, useEffect } from 'react'

export default function Dashboard({ token }: { token: string }) {
  const [stats, setStats] = useState<any>(null)

  useEffect(() => {
    fetch('http://127.0.0.1:8000/api/analytics', { headers: { Authorization: `Bearer ${token}` } })
      .then(r => r.json())
      .then(data => setStats(data))
      .catch(e => console.error(e))
  }, [token])

  if (!stats) return <p>Loading analytics...</p>

  return (
    <div>
      <fieldset>
        <legend>System Analytics Dashboard</legend>
        <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap' }}>
          <div className="window" style={{ width: '150px' }}>
            <div className="title-bar"><div className="title-bar-text">Monitors</div></div>
            <div className="window-body" style={{ textAlign: 'center', fontSize: '24px' }}>
              {stats.total_monitors}
            </div>
          </div>
          <div className="window" style={{ width: '150px' }}>
            <div className="title-bar"><div className="title-bar-text">Global Uptime</div></div>
            <div className="window-body" style={{ textAlign: 'center', fontSize: '24px', color: stats.uptime_percentage > 99 ? 'green' : (stats.uptime_percentage < 90 ? 'red' : 'black') }}>
              {stats.uptime_percentage}%
            </div>
          </div>
          <div className="window" style={{ width: '150px' }}>
            <div className="title-bar"><div className="title-bar-text">Avg Latency</div></div>
            <div className="window-body" style={{ textAlign: 'center', fontSize: '24px' }}>
              {stats.avg_latency_ms} ms
            </div>
          </div>
          <div className="window" style={{ width: '150px' }}>
            <div className="title-bar"><div className="title-bar-text">Failure Rate</div></div>
            <div className="window-body" style={{ textAlign: 'center', fontSize: '24px', color: stats.failure_rate_percentage > 5 ? 'red' : 'black' }}>
              {stats.failure_rate_percentage}%
            </div>
          </div>
          <div className="window" style={{ width: '150px' }}>
            <div className="title-bar"><div className="title-bar-text">Open Incidents</div></div>
            <div className="window-body" style={{ textAlign: 'center', fontSize: '24px', color: stats.open_incidents > 0 ? 'red' : 'green' }}>
              {stats.open_incidents}
            </div>
          </div>
          <div className="window" style={{ width: '150px' }}>
            <div className="title-bar"><div className="title-bar-text">Total Incidents</div></div>
            <div className="window-body" style={{ textAlign: 'center', fontSize: '24px' }}>
              {stats.total_incidents}
            </div>
          </div>
        </div>
      </fieldset>
    </div>
  )
}
