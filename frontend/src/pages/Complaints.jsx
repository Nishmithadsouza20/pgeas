import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const CATS  = ['electrical','plumbing','cleanliness','wifi','other'];
const EMPTY = { category:'electrical', description:'', priority:'medium' };

const PRIORITY_COLOR = { low:'success', medium:'warning', high:'danger' };
const STATUS_COLOR   = { open:'danger', 'in-progress':'warning', resolved:'success' };

export default function Complaints() {
  const { user }  = useAuth();
  const toast     = useToast();
  const isAdmin   = ['super_admin','owner'].includes(user?.role);

  const [complaints, setComplaints] = useState([]);
  const [stats,      setStats]      = useState(null);
  const [filter,     setFilter]     = useState('');
  const [catFilter,  setCatFilter]  = useState('');
  const [modal,      setModal]      = useState(false);
  const [respModal,  setRespModal]  = useState(false);
  const [form,       setForm]       = useState(EMPTY);
  const [respForm,   setRespForm]   = useState({ status:'in-progress', response:'' });
  const [selected,   setSelected]   = useState(null);
  const [error,      setError]      = useState('');
  const [loading,    setLoading]    = useState(true);

  const load = () => {
    const q = new URLSearchParams();
    if (filter)    q.set('status',   filter);
    if (catFilter) q.set('category', catFilter);
    const calls = [api.getComplaints(q.toString())];
    if (isAdmin)   calls.push(api.complaintStats());
    return Promise.all(calls)
      .then(([c, s]) => { setComplaints(c); if(s) setStats(s); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [filter, catFilter]);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const submit = async e => {
    e.preventDefault(); setError('');
    try { await api.createComplaint(form); setModal(false); load(); }
    catch(err) { setError(err.message); }
  };

  const openResp  = c => { setSelected(c); setRespForm({ status: c.status, response: c.response||'' }); setRespModal(true); };

  const submitResp = async e => {
    e.preventDefault();
    try { await api.updateComplaint(selected.id, respForm); setRespModal(false); load(); toast.success('Complaint updated'); }
    catch(err) { toast.error(err.message); }
  };

  return (
    <>
      {/* Stats (admin/owner only) */}
      {isAdmin && stats && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(140px,1fr))', gap:16, marginBottom:24 }}>
          <div className="stat-card">
            <div className="stat-label">Total</div>
            <div className="stat-value">{stats.total}</div>
          </div>
          <div className="stat-card">
            <div className="stat-label">Resolved</div>
            <div className="stat-value" style={{ color:'var(--success)' }}>{stats.resolved}</div>
          </div>
          {(stats.by_status||[]).filter(s => s.status !== 'resolved').map(s => (
            <div key={s.status} className="stat-card">
              <div className="stat-label" style={{ textTransform:'capitalize' }}>{s.status?.replace('-',' ')}</div>
              <div className="stat-value" style={{ color:'var(--warning)' }}>{s.count}</div>
            </div>
          ))}
        </div>
      )}

      {/* Toolbar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {['','open','in-progress','resolved'].map(f => (
            <button key={f} className={`filter-btn ${filter===f?'active':''}`}
              onClick={() => setFilter(f)} style={{ textTransform:'capitalize' }}>
              {f || 'All'}
            </button>
          ))}
          <select value={catFilter} onChange={e => setCatFilter(e.target.value)}
            className="form-input" style={{ width:'auto', borderRadius:20, padding:'5px 12px', fontSize:12 }}>
            <option value="">All Categories</option>
            {CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
          </select>
        </div>
        {!isAdmin && (
          <button className="btn btn-primary btn-sm"
            onClick={() => { setForm(EMPTY); setError(''); setModal(true); }}>
            + Raise Complaint
          </button>
        )}
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /><span>Loading…</span></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(360px,1fr))', gap:16 }}>
          {complaints.map(c => (
            <div key={c.id} className="card" style={{ padding:20 }}>
              {/* Header */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:10 }}>
                <div>
                  {isAdmin && (
                    <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:6 }}>
                      {c.resident_name} · Room {c.room_number||'?'}
                    </div>
                  )}
                  <div style={{ display:'flex', gap:8, alignItems:'center', flexWrap:'wrap' }}>
                    <span className={`badge badge-${PRIORITY_COLOR[c.priority]||'info'}`} style={{ textTransform:'capitalize' }}>
                      {c.priority}
                    </span>
                    <span style={{ fontSize:12, color:'var(--accent)', textTransform:'uppercase', fontWeight:700, letterSpacing:0.5 }}>
                      {c.category}
                    </span>
                  </div>
                </div>
                <span className={`badge badge-${STATUS_COLOR[c.status]||'info'}`} style={{ textTransform:'capitalize', flexShrink:0 }}>
                  {c.status}
                </span>
              </div>

              {/* Description */}
              <p style={{ color:'var(--text-1)', fontSize:14, lineHeight:1.6, marginBottom:10 }}>{c.description}</p>

              {/* Management response */}
              {c.response && (
                <div style={{
                  padding:'10px 14px', background:'var(--bg-hover)', borderRadius:8,
                  borderLeft:'3px solid var(--accent)', marginBottom:10
                }}>
                  <div style={{ fontSize:10, fontWeight:700, letterSpacing:1, color:'var(--accent)', marginBottom:4 }}>
                    MANAGEMENT RESPONSE
                  </div>
                  <div style={{ fontSize:13, color:'var(--text-2)', lineHeight:1.5 }}>{c.response}</div>
                </div>
              )}

              {/* Footer */}
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginTop:4 }}>
                <div style={{ fontSize:11, color:'var(--text-3)' }}>
                  {c.created_at?.slice(0,10)}
                  {c.resolved_at && ` · Resolved ${c.resolved_at.slice(0,10)}`}
                </div>
                {isAdmin && (
                  <button className="btn btn-primary btn-xs" onClick={() => openResp(c)}>Respond</button>
                )}
              </div>
            </div>
          ))}
          {complaints.length === 0 && (
            <div className="empty-state" style={{ gridColumn:'1/-1' }}>
              <div className="empty-state-icon">📢</div>
              <h4>No complaints</h4>
              <p>{filter || catFilter ? 'No complaints match the current filters.' : 'No complaints have been raised yet.'}</p>
            </div>
          )}
        </div>
      )}

      {/* New Complaint Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:440 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-1)' }}>Raise a Complaint</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}

            <form onSubmit={submit}>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select name="category" value={form.category} onChange={handle} className="form-input">
                    {CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Priority</label>
                  <select name="priority" value={form.priority} onChange={handle} className="form-input">
                    {['low','medium','high'].map(p => <option key={p} value={p}>{p.charAt(0).toUpperCase()+p.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Description</label>
                  <textarea name="description" value={form.description} onChange={handle}
                    className="form-input" rows={4}
                    placeholder="Describe the issue in detail…" required
                    style={{ resize:'vertical' }} />
                </div>
              </div>

              <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Submit Complaint</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Respond Modal */}
      {respModal && selected && (
        <div className="modal-overlay" onClick={() => setRespModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:480 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-1)' }}>
                Respond — Complaint #{selected.id}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setRespModal(false)}>✕</button>
            </div>

            <div style={{ padding:'12px 16px', background:'var(--bg-hover)', borderRadius:8, marginBottom:16 }}>
              <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4 }}>
                {selected.category?.toUpperCase()} · {selected.resident_name}
              </div>
              <div style={{ fontSize:14, color:'var(--text-1)', lineHeight:1.5 }}>{selected.description}</div>
            </div>

            <form onSubmit={submitResp}>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">Update Status</label>
                  <select name="status" value={respForm.status}
                    onChange={e => setRespForm(f => ({...f, status:e.target.value}))} className="form-input">
                    {['open','in-progress','resolved'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Response / Note</label>
                  <textarea value={respForm.response}
                    onChange={e => setRespForm(f => ({...f, response:e.target.value}))}
                    className="form-input" rows={3}
                    placeholder="Write your response to the resident…"
                    style={{ resize:'vertical' }} />
                </div>
              </div>

              <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setRespModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Update</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
