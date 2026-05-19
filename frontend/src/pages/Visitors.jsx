import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';

export default function Visitors() {
  const [visitors,  setVisitors]  = useState([]);
  const [active,    setActive]    = useState([]);
  const [residents, setResidents] = useState([]);
  const [modal,     setModal]     = useState(false);
  const [form,      setForm]      = useState({ visitor_name:'', resident_id:'', purpose:'', in_time:'' });
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(true);
  const [tab,       setTab]       = useState('all');

  const load = () => Promise.all([api.getVisitors(), api.getActiveVisitors(), api.getResidents()])
    .then(([v, a, r]) => { setVisitors(v); setActive(a); setResidents(r); })
    .catch(console.error)
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const openNew = () => {
    const now = new Date().toISOString().slice(0,16);
    setForm({ visitor_name:'', resident_id:'', purpose:'', in_time:now });
    setError(''); setModal(true);
  };

  const submit = async e => {
    e.preventDefault(); setError('');
    try {
      const now = new Date().toISOString().slice(0,19).replace('T',' ');
      await api.logVisitor({ ...form, resident_id: Number(form.resident_id), in_time: form.in_time||now });
      setModal(false); load();
    } catch(err) { setError(err.message); }
  };

  const checkout = async id => {
    const now = new Date().toISOString().slice(0,19).replace('T',' ');
    try { await api.checkoutVisitor(id, { out_time: now }); load(); } catch(err) { alert(err.message); }
  };

  const today    = new Date().toISOString().slice(0,10);
  const todayCount = visitors.filter(v => v.in_time?.slice(0,10) === today).length;
  const shown    = tab === 'active' ? active : visitors;

  return (
    <>
      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Visitors',   value: visitors.length,                          color:'var(--text-1)' },
          { label:'Inside Now',       value: active.length,                            color:'var(--success)' },
          { label:'Checked Out',      value: visitors.filter(v => v.out_time).length,  color:'var(--text-2)' },
          { label:"Today's Visitors", value: todayCount,                               color:'var(--accent)' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:8 }}>
          <button className={`filter-btn ${tab==='all'?'active':''}`} onClick={() => setTab('all')}>
            All Visitors
          </button>
          <button className={`filter-btn ${tab==='active'?'active':''}`} onClick={() => setTab('active')}>
            Inside Now ({active.length})
          </button>
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Log Visitor</button>
      </div>

      <div className="card" style={{ padding:0 }}>
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /><span>Loading…</span></div>
        ) : (
          <div className="table-wrap">
            <table className="pg-table">
              <thead>
                <tr>
                  <th>#</th><th>Visitor</th><th>Visiting</th><th>Room</th>
                  <th>Purpose</th><th>In Time</th><th>Out Time</th><th>Action</th>
                </tr>
              </thead>
              <tbody>
                {shown.map((v, i) => (
                  <tr key={v.id}>
                    <td style={{ color:'var(--text-3)', width:40 }}>{i+1}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div style={{
                          width:32, height:32, borderRadius:'50%', background:'var(--bg-hover)',
                          border:'1px solid var(--border)', display:'flex', alignItems:'center',
                          justifyContent:'center', fontSize:14, flexShrink:0
                        }}>
                          👤
                        </div>
                        <span style={{ fontWeight:600, color:'var(--text-1)' }}>{v.visitor_name}</span>
                      </div>
                    </td>
                    <td style={{ color:'var(--text-2)' }}>{v.resident_name}</td>
                    <td>
                      {v.room_number
                        ? <span className="badge badge-info">Room {v.room_number}</span>
                        : <span style={{ color:'var(--text-3)' }}>—</span>}
                    </td>
                    <td style={{ color:'var(--text-2)', fontSize:13 }}>{v.purpose || '—'}</td>
                    <td style={{ fontSize:12, color:'var(--text-3)' }}>
                      {v.in_time?.slice(0,16).replace('T',' ')}
                    </td>
                    <td>
                      {v.out_time
                        ? <span style={{ fontSize:12, color:'var(--text-3)' }}>{v.out_time?.slice(0,16).replace('T',' ')}</span>
                        : <span className="badge badge-success">Inside</span>}
                    </td>
                    <td>
                      {!v.out_time && (
                        <button className="btn btn-ghost btn-xs" onClick={() => checkout(v.id)}>
                          Check Out
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {shown.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign:'center', padding:48, color:'var(--text-3)' }}>
                      No visitors found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ marginTop:8, color:'var(--text-3)', fontSize:12 }}>
        {shown.length} entr{shown.length !== 1 ? 'ies' : 'y'}
      </div>

      {/* Log Visitor Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:440 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-1)' }}>Log Visitor Entry</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}

            <form onSubmit={submit}>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">Visitor Name</label>
                  <input name="visitor_name" value={form.visitor_name} onChange={handle}
                    className="form-input" placeholder="Ramesh Kumar" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Visiting Resident</label>
                  <select name="resident_id" value={form.resident_id} onChange={handle}
                    className="form-input" required>
                    <option value="">Select resident…</option>
                    {residents.map(r => (
                      <option key={r.id} value={r.id}>{r.name} — Room {r.room_number||'?'}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Purpose</label>
                  <input name="purpose" value={form.purpose} onChange={handle}
                    className="form-input" placeholder="Family visit, parcel, etc." />
                </div>
                <div className="form-group">
                  <label className="form-label">In Time</label>
                  <input name="in_time" type="datetime-local" value={form.in_time} onChange={handle}
                    className="form-input" />
                </div>
              </div>

              <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Log Entry</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
