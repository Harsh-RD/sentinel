// Sentinel Unified API Client

const getBaseUrl = (): string => {
  if (import.meta.env.VITE_API_URL) {
    return import.meta.env.VITE_API_URL.replace(/\/$/, '')
  }
  // If running in development with Vite proxy, relative path works best:
  return ''
}

export interface UserSession {
  token: string
  email: string
  role: 'admin' | 'operator' | 'viewer'
}

export interface ServiceItem {
  id: number
  name: string
  description?: string
  slo_target: number
  created_at: string
  updated_at: string
}

export interface MonitorItem {
  id: number
  service_id: number
  name: string
  url: string
  method: string
  interval_seconds: number
  timeout_seconds: number
  failure_threshold: number
  consecutive_failures: number
  last_check_id?: number
  created_at: string
  updated_at: string
}

export interface CheckResultItem {
  id: number
  monitor_id: number
  timestamp: string
  status_code: number | null
  response_time_ms: number | null
  is_up: boolean
  error_message: string | null
}

export interface IncidentCommentItem {
  id: number
  incident_id: number
  user_id: number
  text: string
  created_at: string
}

export interface IncidentItem {
  id: number
  service_id: number
  monitor_id?: number
  status: 'open' | 'acknowledged' | 'resolved'
  severity: 'critical' | 'warning'
  summary: string
  created_at: string
  acknowledged_at?: string
  resolved_at?: string
  acknowledged_by_user_id?: number
  mtta_seconds?: number
  mttr_seconds?: number
}

export interface MaintenanceWindowItem {
  id: number
  service_id: number
  reason: string
  start_time: string
  end_time: string
  created_at: string
}

export interface AnalyticsStats {
  total_monitors: number
  total_incidents: number
  open_incidents: number
  uptime_percentage: number
  avg_latency_ms: number
  failure_rate_percentage: number
}

export interface PublicStatusData {
  overall: string
  global_status: string
  services: {
    id: number
    name: string
    status: string
  }[]
  recent_incidents: {
    id: number
    service_id: number
    status: string
    severity: string
    summary: string
    created_at: string
    resolved_at?: string
  }[]
}

const STORAGE_KEY = 'sentinel_user_session'

export const authStorage = {
  get(): UserSession | null {
    try {
      const data = localStorage.getItem(STORAGE_KEY)
      return data ? JSON.parse(data) : null
    } catch {
      return null
    }
  },
  set(session: UserSession) {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(session))
    } catch {}
  },
  clear() {
    try {
      localStorage.removeItem(STORAGE_KEY)
    } catch {}
  }
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const baseUrl = getBaseUrl()
  const url = `${baseUrl}${endpoint.startsWith('/') ? endpoint : '/' + endpoint}`

  const headers = new Headers(options.headers || {})
  const session = authStorage.get()
  if (session?.token && !headers.has('Authorization')) {
    headers.set('Authorization', `Bearer ${session.token}`)
  }

  let res: Response
  try {
    res = await fetch(url, {
      ...options,
      headers,
    })
  } catch (err: any) {
    // If relative request failed and no VITE_API_URL, try direct localhost:8000 fallback
    if (!baseUrl && !url.startsWith('http')) {
      try {
        res = await fetch(`http://127.0.0.1:8000${endpoint}`, {
          ...options,
          headers,
        })
      } catch (fallbackErr: any) {
        throw new Error(
          'Network Error: Could not connect to Sentinel backend at http://127.0.0.1:8000. Please ensure the backend is running.'
        )
      }
    } else {
      throw new Error(
        `Network Error: Failed to reach backend (${err.message || 'Connection refused'})`
      )
    }
  }

  if (res.status === 204) {
    return {} as T
  }

  if (!res.ok) {
    let errorDetail = `Request failed with status ${res.status}`
    try {
      const errorJson = await res.json()
      if (errorJson.detail) {
        errorDetail = typeof errorJson.detail === 'string' ? errorJson.detail : JSON.stringify(errorJson.detail)
      }
    } catch {
      const text = await res.text()
      if (text) errorDetail = text
    }
    throw new Error(errorDetail)
  }

  return res.json() as Promise<T>
}

export const api = {
  async login(email: string, password: string): Promise<UserSession> {
    const data = await request<{ access_token: string; token_type: string; role: any; email: string }>('/api/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
    const session: UserSession = {
      token: data.access_token,
      email: data.email || email,
      role: data.role || (email.includes('admin') ? 'admin' : email.includes('operator') ? 'operator' : 'viewer'),
    }
    authStorage.set(session)
    return session
  },

  logout() {
    authStorage.clear()
  },

  async checkHealth(): Promise<{ status: string }> {
    return request('/api/health')
  },

  async getAnalytics(): Promise<AnalyticsStats> {
    return request('/api/analytics/')
  },

  async getServices(): Promise<ServiceItem[]> {
    return request('/api/services/')
  },

  async createService(data: { name: string; description?: string; slo_target: number }): Promise<ServiceItem> {
    return request('/api/services/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  async deleteService(id: number): Promise<void> {
    return request(`/api/services/${id}`, { method: 'DELETE' })
  },

  async getMonitors(): Promise<MonitorItem[]> {
    return request('/api/monitors/')
  },

  async createMonitor(data: {
    service_id: number
    name: string
    url: string
    method?: string
    interval_seconds?: number
    timeout_seconds?: number
    failure_threshold?: number
  }): Promise<MonitorItem> {
    return request('/api/monitors/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  async deleteMonitor(id: number): Promise<void> {
    return request(`/api/monitors/${id}`, { method: 'DELETE' })
  },

  async testMonitor(id: number): Promise<{
    status_code: number | null
    response_time_ms: number | null
    is_up: boolean
    error_message: string | null
  }> {
    return request(`/api/monitors/${id}/test`, { method: 'POST' })
  },

  async getMonitorChecks(id: number, limit = 20): Promise<CheckResultItem[]> {
    return request(`/api/monitors/${id}/checks?limit=${limit}`)
  },

  async getIncidents(): Promise<IncidentItem[]> {
    return request('/api/incidents/')
  },

  async acknowledgeIncident(id: number): Promise<IncidentItem> {
    return request(`/api/incidents/${id}/acknowledge`, { method: 'POST' })
  },

  async resolveIncident(id: number): Promise<IncidentItem> {
    return request(`/api/incidents/${id}/resolve`, { method: 'POST' })
  },

  async getIncidentComments(id: number): Promise<IncidentCommentItem[]> {
    return request(`/api/incidents/${id}/comments`)
  },

  async addIncidentComment(id: number, text: string): Promise<IncidentCommentItem> {
    return request(`/api/incidents/${id}/comments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text }),
    })
  },

  async getMaintenanceWindows(): Promise<MaintenanceWindowItem[]> {
    return request('/api/maintenance/')
  },

  async createMaintenanceWindow(data: {
    service_id: number
    reason: string
    start_time: string
    end_time: string
  }): Promise<MaintenanceWindowItem> {
    return request('/api/maintenance/', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    })
  },

  async deleteMaintenanceWindow(id: number): Promise<{ status: string }> {
    return request(`/api/maintenance/${id}`, { method: 'DELETE' })
  },

  async simulateOutage(service_id?: number): Promise<{ message: string; incident_id: number }> {
    return request('/api/maintenance/simulate-outage', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(service_id ? { service_id } : {}),
    })
  },

  async getPublicStatus(): Promise<PublicStatusData> {
    return request('/api/status/')
  },

  async downloadCsvReport(): Promise<void> {
    const baseUrl = getBaseUrl()
    const url = `${baseUrl}/api/maintenance/reports/csv`
    const session = authStorage.get()
    const headers = new Headers()
    if (session?.token) {
      headers.set('Authorization', `Bearer ${session.token}`)
    }
    const res = await fetch(url, { headers })
    if (!res.ok) throw new Error('Failed to download CSV report')
    const blob = await res.blob()
    const downloadUrl = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = downloadUrl
    a.download = `sentinel-incidents-${new Date().toISOString().slice(0, 10)}.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    window.URL.revokeObjectURL(downloadUrl)
  },
}
