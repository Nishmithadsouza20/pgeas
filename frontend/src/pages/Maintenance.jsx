import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const PRIORITY = { low:'#22c55e', medium:'#f59e0b', high:'#FF6B35', urgent:'#ef4444' };
const STATUS_COLOR = { open:'#ef4444', assigned:'#3b82f6', 'in-progress':'#f59e0b', completed:'#22c55e', closed:'#8b5cf6' };
const CATS = ['plumbing','electrical','carpentry','cleaning','painting','appliance','other'];
const TABS = ['all','open','assigned','in-progress','completed'];

export default function Maintenance() {
  const { user } = useAuth();
  const isOwner  = user?.role === 'owner' || user?.role === 'super_admin';
  const [tab,    setTab]    = useState('all');
  const [items,  setItems]  = useState([]);
  const [stats,  setStats]  = useState({});
  const [staff,  setStaff]  = useState([]);
  const [show,   setShow]   = useState(false);
  const [edit,   setEdit]   = useState(null);
  const [form,   setForm]   = useState({ title:'', description:'', category:'other', priority:'medium' });
  const [err,    setErr]    = useState('');
  const [loading,setLoading]= useState(true);

  const load = async () => {
    setLoading(true);
    const q = tab === 'all' ? '' : `status=${tab}`;
    const [rows, s] = await Promise.all([
      api.getMaintenance(q).catch(() => []),
      isOwner ? api.getMaintenanceStats().catch(() => ({})) : Promise.resolve({}),
    ]);
    setItems(Array.isArray(rows) ? rows : []);
    setStats(s);
    if (isOwner && !staff.length) {
      const sl = await api.getStaff().catch(() => []);
      setStaff(sl);
    }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab]);

  const submit = async () => {
    if (!form.title) { setErr('Title is required'); return; }
    setErr('');
    if (edit) await api.updateMaintenance(edit.id, form).catch(e => setErr(e.message));
    else      await api.createMaintenance(form).catch(e => setErr(e.message));
    setShow(false); setEdit(null); setForm({ title:'', description:'', category:'other', priority:'medium' }); load();
  };

  const assign = async (id, staff_id) => {
    await api.updateMaintenance(id, { assigned_to: Number(staff_id), status:'assigned' }).catch(e => setErr(e.message));
    load();
  };

  const setStatus = async (id, status) => {
    await api.updateMaintenance(id, { status }).catch(e => setErr(e.message));
    load();
  };

  const openEdit = r => { setEdit(r); setForm({ title:r.title, description:r.description||'', category:r.category, priority:r.priority }); setShow(true); };

  return (
    <div>
      {/* Stats */}
      {isOwner && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:14, marginBottom:20 }}>
          {[
            { label:'Open',        value: stats.open||0,        color:'#ef4444' },
            { label:'Assigned',    value: stats.assigned||0,    color:'#3b82f6' },
            { label:'In Progress', value: stats.in_progress||0, color:'#f59e0b' },
            { label:'Completed',   value: stats.completed||0,   color:'#22c55e' },
            { label:'Total Cost',  value: `₹${(stats.total_cost||0).toLocaleString()}`, color:'var(--accent)' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding:'14px 16px', textAlign:'center' }}>
              <div style={{ fontSize:10, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Tabs + Add */}
      <div style={{ display:'flex', gap:10, marginBottom:20, flexWrap:'wrap', alignItems:'center' }}>
        <div style={{ display:'flex', gap:0, background:'var(--bg-card)', borderRadius:10, border:'1px solid var(--border)', overflow:'hidden' }}>
          {TABS.map(t => (
            <button key={t} onClick={() => setTab(t)} className={`btn btn-sm ${tab===t?'btn-primary':'btn-ghost'}`}
              style={{ borderRadius:0, padding:'8px 14px', textTransform:'capitalize' }}>{t}</button>
          ))}
        </div>
        <button className="btn btn-primary" style={{ marginLeft:'auto' }} onClick={() => { setEdit(null); setForm({ title:'', description:'', category:'other', priority:'medium' }); setShow(true); }}>
          + New Request
        </button>
      </div>

      {loading ? <div className="spinner-wrap"><div className="spinner" /></div> : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(340px,1fr))', gap:16 }}>
          {items.map(r => (
            <div key={r.id} className="card" style={{ padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div style={{ flex:1 }}>
                  <div style={{ fontWeight:700, fontSize:15, color:'var(--text-1)', marginBottom:2 }}>{r.title}</div>
                  <div style={{ fontSize:12, color:'var(--text-3)' }}>{r.category} · #{r.id}</div>
                </div>
                <div style={{ display:'flex', gap:6, flexShrink:0 }}>
                  <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, background:`${PRIORITY[r.priority]}20`, color:PRIORITY[r.priority] }}>{r.priority}</span>
                  <span style={{ padding:'2px 8px', borderRadius:20, fontSize:10, fontWeight:700, background:`${STATUS_COLOR[r.status]}20`, color:STATUS_COLOR[r.status] }}>{r.status}</span>
                </div>
              </div>
              {r.description && <div style={{ fontSize:13, color:'var(--text-2)', marginBottom:10, lineHeight:1.5 }}>{r.description}</div>}
              <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:12 }}>
                {r.reported_by_name && <span>Reported by: {r.reported_by_name} · </span>}
                {r.assigned_to_name && <span style={{ color:'#3b82f6' }}>Assigned: {r.assigned_to_name} · </span>}
                {new Date(r.created_at).toLocaleDateString('en-IN')}
              </div>
              {isOwner && (
                <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
                  {r.status !== 'completed' && r.status !== 'closed' && (
                    <select onChange={e => e.target.value && assign(r.id, e.target.value)}
                      className="form-input" style={{ flex:1, padding:'5px 8px', fontSize:12, minWidth:0 }}>
                      <option value="">Assign to staff…</option>
                      {staff.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                    </select>
                  )}
                  {r.status === 'assigned' && <button className="btn btn-sm btn-ghost" onClick={() => setStatus(r.id,'in-progress')}>Start</button>}
                  {r.status === 'in-progress' && <button className="btn btn-sm" style={{ background:'#22c55e18',color:'#22c55e',border:'1px solid #22c55e30'}} onClick={() => setStatus(r.id,'completed')}>Complete</button>}
                  <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>Edit</button>
                </div>
              )}
            </div>
          ))}
          {items.length === 0 && <div style={{ gridColumn:'1/-1', padding:40, textAlign:'center', color:'var(--text-3)' }}>No requests found</div>}
        </div>
      )}

      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:480 }}>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:20 }}>{edit ? 'Edit Request' : 'New Maintenance Request'}</div>
            {err && <div className="alert alert-error" style={{ marginBottom:12 }}>{err}</div>}
            <div className="form-group">
              <label className="form-label">Title *</label>
              <input value={form.title} onChange={e => setForm(f=>({...f,title:e.target.value}))} className="form-input" placeholder="e.g. Leaking tap in Room 101" />
            </div>
            <div className="form-group">
              <label className="form-label">Description</label>
              <textarea value={form.description} onChange={e => setForm(f=>({...f,description:e.target.value}))} className="form-input" rows={3} placeholder="Detailed description of the issue…" style={{ resize:'vertical' }} />
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div className="form-group">
                <label className="form-label">Category</label>
                <select value={form.category} onChange={e => setForm(f=>({...f,category:e.target.value}))} className="form-input">
                  {CATS.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Priority</label>
                <select value={form.priority} onChange={e => setForm(f=>({...f,priority:e.target.value}))} className="form-input">
                  {['low','medium','high','urgent'].map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
              <button className="btn btn-ghost" onClick={() => setShow(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit}>{edit ? 'Update' : 'Submit Request'}</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
