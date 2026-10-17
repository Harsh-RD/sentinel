import { useState } from 'react'
import { api } from './api'

interface OperationsProps {
  userRole?: string
  onNavigateTab?: (tab: string) => void
}

export default function Operations({ userRole, onNavigateTab }: OperationsProps) {
  const [downloading, setDownloading] = useState(false)
  const [simulating, setSimulating] = useState(false)
  const [demoStatus, setDemoStatus] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)

  const handleDownloadCsv = async () => {
    setDownloading(true)
    setError(null)
    try {
      await api.downloadCsvReport()
      setDemoStatus('CSV audit report downloaded successfully!')
    } catch (err: any) {
      setError(err.message || 'Failed to download CSV')
    } finally {
      setDownloading(false)
    }
  }

  const handleTriggerSimulate = async () => {
    setSimulating(true)
    setError(null)
    try {
      const res = await api.simulateOutage()
      setDemoStatus(`Demo outage triggered: ${res.message}. Check the Incidents tab!`)
      if (onNavigateTab) {
        setTimeout(() => onNavigateTab('Incidents'), 800)
      }
    } catch (err: any) {
      setError(err.message || 'Failed to trigger simulation')
    } finally {
      setSimulating(false)
    }
  }

  return (
    <div>
      {error && (
        <div style={{ background: '#fdd', border: '1px solid #c00', padding: '6px 10px', marginBottom: '12px', fontSize: '12px' }}>
          ⚠️ {error}
        </div>
      )}
      {demoStatus && (
        <div style={{ background: '#dfd', border: '1px solid #0a0', padding: '6px 10px', marginBottom: '12px', fontSize: '12px' }}>
          ✓ {demoStatus}
        </div>
      )}

      {/* CSV Reports */}
      <fieldset style={{ marginBottom: '16px' }}>
        <legend>Compliance & Audit Reports (Phase 6)</legend>
        <p style={{ fontSize: '12px', margin: '4px 0 10px 0' }}>
          Export comprehensive incident postmortem and reliability records formatted for SRE audit log reviews.
        </p>
        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
          <button
            onClick={handleDownloadCsv}
            disabled={downloading}
            style={{ fontWeight: 'bold' }}
          >
            {downloading ? 'Generating CSV...' : '📥 Download Incidents CSV Report'}
          </button>
          <span style={{ fontSize: '11px', color: '#555' }}>
            Includes ID, Service ID, Monitor ID, Severity, Status, Created At, and Resolved At.
          </span>
        </div>
      </fieldset>

      {/* Demo Acceptance Path Interactive Guide */}
      <fieldset style={{ marginBottom: '16px' }}>
        <legend>Placement Interview: 7-Step Outage-to-Recovery Demo Guide</legend>
        <div style={{ fontSize: '12px', lineHeight: '1.6' }}>
          <p style={{ margin: '0 0 8px 0' }}>
            Follow these verified steps to demonstrate Sentinel's full SRE workflow during portfolio presentations:
          </p>
          <ol style={{ paddingLeft: '20px', margin: '0 0 12px 0' }}>
            <li>
              <strong>Healthy Baseline:</strong> Inspect the <em>Dashboard</em> to verify seeded services (Payments Gateway) with healthy probes.
            </li>
            <li>
              <strong>Trigger Outage:</strong> Click the button below to inject an upstream failure on Payments Gateway.
              <div style={{ margin: '6px 0' }}>
                <button onClick={handleTriggerSimulate} disabled={simulating} style={{ fontWeight: 'bold' }}>
                  {simulating ? 'Injecting Outage...' : '⚡ Step 2: Inject Outage Now'}
                </button>
              </div>
            </li>
            <li>
              <strong>Incident Opened:</strong> Switch to the <em>Incidents</em> tab to see the critical incident logged with alerts recorded.
            </li>
            <li>
              <strong>Acknowledge & War Room:</strong> Operator acknowledges the incident (calculating MTTA) and logs an investigation comment.
            </li>
            <li>
              <strong>Maintenance Suppression:</strong> In the <em>Maintenance</em> tab, schedule a window to suppress alerts during recovery.
            </li>
            <li>
              <strong>Endpoint Recovery:</strong> Mark the incident Resolved (recording MTTR).
            </li>
            <li>
              <strong>Public Status & Audit:</strong> Verify the <em>Status Page</em> reflects real-time status and export the CSV report.
            </li>
          </ol>
        </div>
      </fieldset>

      {/* Environment Diagnostics */}
      <fieldset>
        <legend>System Architecture & Runtime Diagnostics</legend>
        <table className="sentinel-table">
          <tbody>
            <tr>
              <td style={{ width: '200px', fontWeight: 'bold' }}>Active User Role</td>
              <td><span className="badge badge-ack">{userRole?.toUpperCase() || 'ANONYMOUS'}</span></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold' }}>FastAPI Backend</td>
              <td><span className="badge badge-up">ONLINE (Port 8000)</span></td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold' }}>Database & Migrations</td>
              <td>SQLAlchemy 2.0 with Alembic Versioning (Zero startup auto-creation)</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold' }}>SSRF Protection</td>
              <td>Active (Loopback, 169.254.169.254, and Private IP ranges filtered)</td>
            </tr>
            <tr>
              <td style={{ fontWeight: 'bold' }}>UI Theme Engine</td>
              <td>Authentic 98.css with blended NOC telemetry micro-components</td>
            </tr>
          </tbody>
        </table>
      </fieldset>
    </div>
  )
}
