import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const CATS = ['general','payment','maintenance','rules','security','important'];
const EMPTY = { title:'', content:'', category:'general', is_important:0 };
const CAT_COLOR = {
  general:'#3b82f6', payment:'#f59e0b', maintenance:'#8b5cf6',
  rules:'#22c55e', security:'#ef4444', important:'#FF6B35'
};

export default function Notices() {
  const { user }  = useAuth();
  const toast     = useToast();
  const isAdmin   = ['super_admin','owner'].includes(user?.role);

  const [notices,   setNotices]   = useState([]);
  const [modal,     setModal]     = useState(false);
  const [form,      setForm]      = useState(EMPTY);
  const [editing,   setEditing]   = useState(null);
  const [error,     setError]     = useState('');
  const [catFilter, setCat]       = useState('');
  const [loading,   setLoading]   = useState(true);

  const load = () => api.getNotices()
    .then(setNotices).catch(console.error).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handle   = e => setForm(f => ({ ...f, [e.target.name]: e.target.type==='checkbox' ? (e.target.checked?1:0) : e.target.value }));
  const openNew  = () => { setForm(EMPTY); setEditing(null); setError(''); setModal(true); };
  const openEdit = n => { setForm({ ...n }); setEditing(n.id); setError(''); setModal(true); };

  const submit = async e => {
    e.preventDefault(); setError('');
    try {
      if (editing) await api.updateNotice(editing, form);
      else         await api.createNotice(form);
      setModal(false); load();
    } catch(err) { setError(err.message); }
  };

  const del = async id => {
    if (!window.confirm('Remove this notice?')) return;
    try { await api.deleteNotice(id); load(); toast.success('Notice removed'); } catch(err) { toast.error(err.message); }
  };

  const markRead = async id => {
    try { await api.markRead(id); load(); } catch {}
  };

  const filtered = catFilter ? notices.filter(n => n.category === catFilter) : notices;
  const unread   = notices.filter(n => !n.is_read).length;

  return (
    <>
      {/* Unread banner */}
      {unread > 0 && (
        <div className="alert alert-error" style={{ marginBottom:16 }}>
          {unread} unread notice{unread > 1 ? 's' : ''} — click to mark as read
        </div>
      )}

      {/* Filter strip + Add */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <button className={`filter-btn ${catFilter===''?'active':''}`} onClick={() => setCat('')}>All</button>
          {CATS.map(c => (
            <button key={c} onClick={() => setCat(c)}
              style={{
                padding:'5px 14px', borderRadius:20, fontSize:12, cursor:'pointer',
                textTransform:'capitalize', border:`1.5px solid ${CAT_COLOR[c]||'var(--border)'}`,
                background: catFilter===c ? CAT_COLOR[c] : 'transparent',
                color: catFilter===c ? '#fff' : CAT_COLOR[c]||'var(--text-2)',
                transition:'all 0.15s',
              }}>
              {c}
            </button>
          ))}
        </div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Post Notice</button>
        )}
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /><span>Loading…</span></div>
      ) : (
        <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
          {filtered.length === 0 && (
            <div className="empty-state">
              <div className="empty-state-icon">📌</div>
              <h4>No notices</h4>
              <p>{catFilter ? 'No notices in this category.' : 'No notices have been posted yet.'}</p>
              {isAdmin && !catFilter && <button className="btn btn-primary btn-sm" onClick={openNew}>+ Post Notice</button>}
            </div>
          )}
          {filtered.map(n => (
            <div key={n.id} className="card"
              style={{
                padding:20, opacity: n.is_read ? 0.72 : 1, cursor:'pointer',
                borderLeft: n.is_important ? '4px solid var(--accent)' : '4px solid transparent',
                transition:'opacity 0.2s',
              }}
              onClick={() => !n.is_read && markRead(n.id)}>

              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:16 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:6, flexWrap:'wrap' }}>
                    {n.is_important && <span style={{ fontSize:15 }}>⚠️</span>}
                    <span style={{ fontWeight:700, fontSize:15, color:'var(--text-1)' }}>{n.title}</span>
                    <span style={{
                      padding:'2px 8px', borderRadius:10, fontSize:10, fontWeight:700,
                      textTransform:'uppercase', letterSpacing:0.5,
                      background: `${CAT_COLOR[n.category]||'#3b82f6'}18`,
                      color: CAT_COLOR[n.category]||'#3b82f6',
                      border: `1px solid ${CAT_COLOR[n.category]||'#3b82f6'}40`,
                    }}>
                      {n.category}
                    </span>
                    {!n.is_read && (
                      <span style={{ width:7, height:7, borderRadius:'50%', background:'var(--accent)', display:'inline-block' }} />
                    )}
                  </div>
                  <p style={{ margin:0, color:'var(--text-2)', fontSize:13, lineHeight:1.65 }}>{n.content}</p>

                  {isAdmin && (
                    <div style={{ display:'flex', gap:8, marginTop:10 }}>
                      <button className="btn btn-ghost btn-xs"
                        onClick={e => { e.stopPropagation(); openEdit(n); }}>Edit</button>
                      <button className="btn btn-danger btn-xs"
                        onClick={e => { e.stopPropagation(); del(n.id); }}>Remove</button>
                    </div>
                  )}
                </div>

                <div style={{ textAlign:'right', flexShrink:0 }}>
                  <div style={{ fontSize:11, color:'var(--text-3)' }}>{n.created_at?.slice(0,10)}</div>
                  {n.posted_by_name && (
                    <div style={{ fontSize:11, color:'var(--accent)', marginTop:3 }}>— {n.posted_by_name}</div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:480 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-1)' }}>
                {editing ? 'Edit Notice' : 'Post Notice'}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}

            <form onSubmit={submit}>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">Title</label>
                  <input name="title" value={form.title} onChange={handle}
                    className="form-input" placeholder="Notice title…" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Content</label>
                  <textarea name="content" value={form.content} onChange={handle}
                    className="form-input" rows={4} placeholder="Notice content…"
                    required style={{ resize:'vertical' }} />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select name="category" value={form.category} onChange={handle} className="form-input">
                    {CATS.map(c => (
                      <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                  <input type="checkbox" id="imp" name="is_important"
                    checked={form.is_important===1} onChange={handle}
                    style={{ width:16, height:16, cursor:'pointer', accentColor:'var(--accent)' }} />
                  <label htmlFor="imp" style={{ color:'var(--text-2)', fontSize:13, cursor:'pointer' }}>
                    Mark as Important
                  </label>
                </div>
              </div>

              <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Post Notice</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
