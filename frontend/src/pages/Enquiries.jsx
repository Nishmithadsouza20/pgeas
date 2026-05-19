import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';

const STATUS_CFG = {
  new:        { color:'#3b82f6', bg:'#3b82f618', label:'New' },
  'follow-up':{ color:'#f59e0b', bg:'#f59e0b18', label:'Follow-Up' },
  interested: { color:'#8b5cf6', bg:'#8b5cf618', label:'Interested' },
  converted:  { color:'#22c55e', bg:'#22c55e18', label:'Converted' },
  lost:       { color:'#ef4444', bg:'#ef444418', label:'Lost' },
};

const SOURCES = ['walk-in','phone','website','referral','social-media','other'];
const STATUSES = ['new','follow-up','interested','converted','lost'];

const EMPTY = { name:'', phone:'', email:'', room_type_preference:'', budget:'', source:'walk-in', status:'new', notes:'', follow_up_date:'' };

export default function Enquiries() {
  const [data,    setData]    = useState({ enquiries:[], stats:{} });
  const [loading, setLoading] = useState(true);
  const [show,    setShow]    = useState(false);
  const [edit,    setEdit]    = useState(null);
  const [form,    setForm]    = useState(EMPTY);
  const [filter,  setFilter]  = useState('all');
  const [err,     setErr]     = useState('');

  const load = async () => {
    setLoading(true);
    const d = await api.getEnquiries(filter === 'all' ? '' : `status=${filter}`).catch(() => ({ enquiries:[], stats:{} }));
    setData(d);
    setLoading(false);
  };

  useEffect(() => { load(); }, [filter]);

  const openEdit = e => { setEdit(e); setForm({ name:e.name, phone:e.phone||'', email:e.email||'', room_type_preference:e.room_type_preference||'', budget:e.budget||'', source:e.source||'walk-in', status:e.status, notes:e.notes||'', follow_up_date:e.follow_up_date||'' }); setShow(true); };

  const submit = async () => {
    if (!form.name) { setErr('Name is required'); return; }
    setErr('');
    if (edit) await api.updateEnquiry(edit.id, form).catch(e => setErr(e.message));
    else      await api.createEnquiry(form).catch(e => setErr(e.message));
    setShow(false); setEdit(null); setForm(EMPTY); load();
  };

  const quickStatus = async (id, status) => {
    await api.updateEnquiry(id, { status }).catch(console.error);
    load();
  };

  const stats = data.stats || {};

  return (
    <div>
      {/* Pipeline Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:12, marginBottom:20 }}>
        {Object.entries(STATUS_CFG).map(([k, v]) => (
          <div key={k} className="card" onClick={() => setFilter(k === filter ? 'all' : k)}
            style={{ padding:'14px 16px', textAlign:'center', cursor:'pointer', border: filter===k ? `2px solid ${v.color}` : '1px solid var(--border)' }}>
            <div style={{ fontSize:10, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{v.label}</div>
            <div style={{ fontSize:24, fontWeight:900, color:v.color }}>{stats[k.replace('-','_')]||0}</div>
          </div>
        ))}
      </div>

      {/* Search + Add */}
      <div style={{ display:'flex', gap:10, marginBottom:20, alignItems:'center' }}>
        <button className="btn btn-ghost btn-sm" onClick={() => setFilter('all')} style={{ opacity: filter==='all'?1:0.5 }}>All Enquiries</button>
        <button className="btn btn-primary" style={{ marginLeft:'auto' }} onClick={() => { setEdit(null); setForm(EMPTY); setShow(true); }}>+ New Enquiry</button>
      </div>

      {loading ? <div className="spinner-wrap"><div className="spinner" /></div> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(320px,1fr))', gap:16 }}>
          {(data.enquiries||[]).map(e => {
            const cfg = STATUS_CFG[e.status] || {};
            return (
              <div key={e.id} className="card" style={{ padding:20 }}>
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15 }}>{e.name}</div>
                    <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>{e.phone} {e.email ? `· ${e.email}` : ''}</div>
                  </div>
                  <span style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, background:cfg.bg, color:cfg.color, flexShrink:0 }}>{cfg.label}</span>
                </div>
                <div style={{ fontSize:12, color:'var(--text-2)', marginBottom:10 }}>
                  {e.room_type_preference && <span>Prefers: {e.room_type_preference} · </span>}
                  {e.budget > 0 && <span>Budget: ₹{Number(e.budget).toLocaleString()} · </span>}
                  <span>via {e.source}</span>
                </div>
                {e.notes && <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:10, padding:'8px 12px', background:'var(--bg-hover)', borderRadius:8 }}>{e.notes}</div>}
                {e.follow_up_date && <div style={{ fontSize:11, color:'#f59e0b', marginBottom:10 }}>📅 Follow-up: {e.follow_up_date}</div>}
                <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                  {STATUSES.filter(s => s !== e.status).slice(0,3).map(s => (
                    <button key={s} onClick={() => quickStatus(e.id, s)}
                      style={{ padding:'3px 10px', borderRadius:20, fontSize:10, fontWeight:700, cursor:'pointer',
                        border:`1px solid ${STATUS_CFG[s].color}40`, background:'transparent', color:STATUS_CFG[s].color }}>
                      → {STATUS_CFG[s].label}
                    </button>
                  ))}
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(e)} style={{ marginLeft:'auto', fontSize:11 }}>Edit</button>
                </div>
              </div>
            );
          })}
          {(data.enquiries||[]).length === 0 && (
            <div style={{ gridColumn:'1/-1', padding:60, textAlign:'center', color:'var(--text-3)' }}>
              <div style={{ fontSize:40, marginBottom:12 }}>📋</div>
              <div style={{ fontSize:16, fontWeight:700 }}>No enquiries yet</div>
              <div style={{ fontSize:13, marginTop:4 }}>Log your first walk-in or phone enquiry</div>
            </div>
          )}
        </div>
      )}

      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:520 }}>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:20 }}>{edit ? 'Edit Enquiry' : 'New Enquiry'}</div>
            {err && <div className="alert alert-error" style={{ marginBottom:12 }}>{err}</div>}
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Full Name *</label>
                <input value={form.name} onChange={e => setForm(f=>({...f,name:e.target.value}))} className="form-input" placeholder="Prospective tenant's name" />
              </div>
              <div className="form-group">
                <label className="form-label">Phone</label>
                <input value={form.phone} onChange={e => setForm(f=>({...f,phone:e.target.value}))} className="form-input" placeholder="9800000000" />
              </div>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input type="email" value={form.email} onChange={e => setForm(f=>({...f,email:e.target.value}))} className="form-input" placeholder="optional" />
              </div>
              <div className="form-group">
                <label className="form-label">Room Type Preference</label>
                <input value={form.room_type_preference} onChange={e => setForm(f=>({...f,room_type_preference:e.target.value}))} className="form-input" placeholder="Single AC, Double sharing…" />
              </div>
              <div className="form-group">
                <label className="form-label">Monthly Budget (₹)</label>
                <input type="number" value={form.budget} onChange={e => setForm(f=>({...f,budget:e.target.value}))} className="form-input" placeholder="8000" min={0} />
              </div>
              <div className="form-group">
                <label className="form-label">Source</label>
                <select value={form.source} onChange={e => setForm(f=>({...f,source:e.target.value}))} className="form-input">
                  {SOURCES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Status</label>
                <select value={form.status} onChange={e => setForm(f=>({...f,status:e.target.value}))} className="form-input">
                  {STATUSES.map(s => <option key={s} value={s}>{STATUS_CFG[s]?.label||s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Follow-up Date</label>
                <input type="date" value={form.follow_up_date} onChange={e => setForm(f=>({...f,follow_up_date:e.target.value}))} className="form-input" />
              </div>
              <div className="form-group" style={{ gridColumn:'1/-1' }}>
                <label className="form-label">Notes</label>
                <textarea value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} className="form-input" rows={2} placeholder="Any additional notes about the prospect…" style={{ resize:'vertical' }} />
              </div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
              <button className="btn btn-ghost" onClick={() => setShow(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit}>{edit ? 'Update' : 'Add Enquiry'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
