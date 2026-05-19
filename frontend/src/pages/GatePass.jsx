import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const STATUS_CFG = {
  pending:  { color:'#f59e0b', bg:'#f59e0b18', label:'Pending' },
  approved: { color:'#22c55e', bg:'#22c55e18', label:'Approved' },
  rejected: { color:'#ef4444', bg:'#ef444418', label:'Rejected' },
  returned: { color:'#8b5cf6', bg:'#8b5cf618', label:'Returned' },
};

export default function GatePass() {
  const { user } = useAuth();
  const isOwner  = user?.role === 'owner' || user?.role === 'super_admin';
  const [passes,  setPasses]  = useState([]);
  const [loading, setLoading] = useState(true);
  const [show,    setShow]    = useState(false);
  const [filter,  setFilter]  = useState('all');
  const [form,    setForm]    = useState({ purpose:'', destination:'', from_date:'', to_date:'' });
  const [residents, setResidents] = useState([]);
  const [selResident, setSelResident] = useState('');
  const [err, setErr] = useState('');

  const today = new Date().toISOString().split('T')[0];

  const load = async () => {
    setLoading(true);
    const q = filter === 'all' ? '' : `status=${filter}`;
    const rows = await api.getGatePasses(q).catch(() => []);
    setPasses(Array.isArray(rows) ? rows : []);
    if (isOwner && !residents.length) {
      const r = await api.getResidents().catch(() => []);
      setResidents(Array.isArray(r) ? r : []);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const submit = async () => {
    if (!form.from_date || !form.to_date) { setErr('Dates are required'); return; }
    setErr('');
    const payload = { ...form };
    if (isOwner && selResident) {
      const r = residents.find(x => x.id === Number(selResident));
      if (r) { payload.resident_id = r.id; payload.resident_name = r.name; }
    }
    await api.createGatePass(payload).catch(e => setErr(e.message));
    setShow(false); setForm({ purpose:'', destination:'', from_date:'', to_date:'' }); load();
  };

  const setStatus = async (id, status) => {
    const approved_by = status === 'approved' ? user?.name || 'Owner' : undefined;
    await api.updateGatePass(id, { status, ...(approved_by ? { approved_by } : {}) }).catch(e => setErr(e.message));
    load();
  };

  const pending_count = passes.filter(p => p.status === 'pending').length;

  return (
    <div>
      {/* Summary Cards */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:20 }}>
        {[
          { label:'Pending Approval', value: passes.filter(p=>p.status==='pending').length,  color:'#f59e0b' },
          { label:'Approved',         value: passes.filter(p=>p.status==='approved').length, color:'#22c55e' },
          { label:'Currently Out',    value: passes.filter(p=>p.status==='approved').length, color:'#3b82f6' },
          { label:'Total Requests',   value: passes.length, color:'var(--accent)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:'14px 18px', textAlign:'center' }}>
            <div style={{ fontSize:10, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{s.label}</div>
            <div style={{ fontSize:24, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Filters + Add */}
      <div style={{ display:'flex', gap:10, marginBottom:20, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:0, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
          {['all','pending','approved','returned'].map(f => (
            <button key={f} onClick={() => setFilter(f)} className={`btn btn-sm ${filter===f?'btn-primary':'btn-ghost'}`}
              style={{ borderRadius:0, padding:'8px 14px', textTransform:'capitalize', position:'relative' }}>
              {f}
              {f==='pending' && pending_count > 0 && (
                <span style={{ position:'absolute', top:4, right:4, width:7, height:7, borderRadius:'50%', background:'#ef4444' }} />
              )}
            </button>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginLeft:'auto' }} onClick={() => setShow(true)}>+ Request Pass</button>
      </div>

      {loading ? <div className="spinner-wrap"><div className="spinner" /></div> : (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--bg-hover)' }}>
                {['Resident','Purpose','Destination','From','To','Status','Actions'].map(h => (
                  <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {passes.map(p => {
                const cfg = STATUS_CFG[p.status] || {};
                return (
                  <tr key={p.id} style={{ borderTop:'1px solid var(--border)' }}>
                    <td style={{ padding:'12px 16px', fontWeight:600 }}>{p.resident_name || '—'}</td>
                    <td style={{ padding:'12px 16px', color:'var(--text-2)', fontSize:13 }}>{p.purpose || '—'}</td>
                    <td style={{ padding:'12px 16px', color:'var(--text-2)', fontSize:13 }}>{p.destination || '—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:13 }}>{p.from_date}</td>
                    <td style={{ padding:'12px 16px', fontSize:13 }}>{p.to_date}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:cfg.bg, color:cfg.color }}>{cfg.label}</span>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      {isOwner && p.status === 'pending' && (
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-sm" style={{ background:'#22c55e18',color:'#22c55e',border:'1px solid #22c55e30'}} onClick={() => setStatus(p.id,'approved')}>Approve</button>
                          <button className="btn btn-sm" style={{ background:'#ef444418',color:'#ef4444',border:'1px solid #ef444430'}} onClick={() => setStatus(p.id,'rejected')}>Reject</button>
                        </div>
                      )}
                      {p.status === 'approved' && (
                        <button className="btn btn-ghost btn-sm" onClick={() => setStatus(p.id,'returned')}>Mark Returned</button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {passes.length === 0 && (
                <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>No gate passes found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:440 }}>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:20 }}>Request Gate Pass / Leave</div>
            {err && <div className="alert alert-error" style={{ marginBottom:12 }}>{err}</div>}
            {isOwner && (
              <div className="form-group">
                <label className="form-label">Resident</label>
                <select value={selResident} onChange={e => setSelResident(e.target.value)} className="form-input">
                  <option value="">Select resident…</option>
                  {residents.map(r => <option key={r.id} value={r.id}>{r.name} — Room {r.room_number}</option>)}
                </select>
              </div>
            )}
            {[
              { name:'purpose',     label:'Purpose',     placeholder:'Going home for vacation' },
              { name:'destination', label:'Destination', placeholder:'Mysore, Karnataka' },
            ].map(f => (
              <div key={f.name} className="form-group">
                <label className="form-label">{f.label}</label>
                <input value={form[f.name]} onChange={e => setForm(x=>({...x,[f.name]:e.target.value}))} className="form-input" placeholder={f.placeholder} />
              </div>
            ))}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div className="form-group">
                <label className="form-label">From Date *</label>
                <input type="date" value={form.from_date} min={today} onChange={e => setForm(x=>({...x,from_date:e.target.value}))} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Return Date *</label>
                <input type="date" value={form.to_date} min={form.from_date||today} onChange={e => setForm(x=>({...x,to_date:e.target.value}))} className="form-input" />
              </div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
              <button className="btn btn-ghost" onClick={() => setShow(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit}>Submit Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
