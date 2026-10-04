import { useState, useEffect } from 'react'

export default function Services({ token }: { token: string }) {
  const [services, setServices] = useState<any[]>([])
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')

  useEffect(() => {
    fetch('http://localhost:8000/api/services', {
      headers: { Authorization: `Bearer ${token}` }
    })
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data)) setServices(data)
      })
  }, [token])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    const res = await fetch('http://localhost:8000/api/services', {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`
      },
      body: JSON.stringify({ name, description, slo_target: 0.999 })
    })
    if (res.ok) {
      const newService = await res.json()
      setServices([...services, newService])
      setName('')
      setDescription('')
    } else {
      alert('Failed to create service (Forbidden?)')
    }
  }

  return (
    <div>
      <table className="interactive" style={{ width: '100%' }}>
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Description</th>
            <th>SLO Target</th>
          </tr>
        </thead>
        <tbody>
          {services.map(s => (
            <tr key={s.id}>
              <td>{s.id}</td>
              <td>{s.name}</td>
              <td>{s.description}</td>
              <td>{s.slo_target * 100}%</td>
            </tr>
          ))}
        </tbody>
      </table>
      
      <fieldset style={{ marginTop: '20px' }}>
        <legend>Create Service (Admin Only)</legend>
        <form onSubmit={handleCreate}>
          <div className="field-row">
            <label style={{width: '80px'}}>Name:</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} required />
          </div>
          <div className="field-row" style={{marginTop: '10px'}}>
            <label style={{width: '80px'}}>Description:</label>
            <input type="text" value={description} onChange={e => setDescription(e.target.value)} />
          </div>
          <button style={{marginTop: '10px'}} type="submit">Create</button>
        </form>
      </fieldset>
    </div>
  )
}
