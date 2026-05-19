import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';

const ROLES   = ['warden','cook','security','receptionist','accountant','maintenance','cleaner','other'];
const SHIFTS  = ['day','night','both'];
const EMPTY   = { name:'', role:'warden', phone:'', email:'', salary:'', join_date:'', shift:'day', status:'active', notes:'' };

const ROLE_ICON = {
  warden:'🏠', cook:'👨‍🍳', security:'🔒', receptionist:'📋',
  accountant:'📊', maintenance:'🔧', cleaner:'🧹', other:'👤'
};
const ROLE_COLOR = {
  warden:'#FF6B35', cook:'#22c55e', security:'#3b82f6', receptionist:'#8b5cf6',
  accountant:'#f59e0b', maintenance:'#ef4444', cleaner:'#06b6d4', other:'#6b7280'
};

export default function Staff() {
  const [staff,   setStaff]   = useState([]);
  const [stats,   setStats]   = useState(null);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [error,   setError]   = useState('');
  const [filter,  setFilter]  = useState('all');
  const [loading, setLoading] = useState(true);

  const load = () => Promise.all([api.getStaff(), api.getStaffStats()])
    .then(([s, st]) => { setStaff(s); setStats(st); })
    .catch(console.error)
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handle   = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const openNew  = () => { setForm(EMPTY); setEditing(null); setError(''); setModal(true); };
  const openEdit = s => { setForm({ ...s }); setEditing(s.id); setError(''); setModal(true); };

  const submit = async e => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, salary: Number(form.salary) };
      if (editing) await api.updateStaff(editing, payload);
      else         await api.createStaff(payload);
      setModal(false); load();
    } catch (err) { setError(err.message); }
  };

  const del = async id => {
    if (!window.confirm('Remove this staff member?')) return;
    try { await api.deleteStaff(id); load(); } catch (err) { alert(err.message); }
  };

  const filtered = filter === 'all' ? staff : staff.filter(s => s.role === filter);

  return (
    <>
      {/* Plan banner */}
      <div style={{
        background:'linear-gradient(135deg,#1a1a2e,#16213e)',
        border:'1px solid rgba(139,92,246,0.3)', borderRadius:12,
        padding:'14px 20px', marginBottom:24,
        display:'flex', alignItems:'center', gap:12
      }}>
        <span style={{ fontSize:20 }}>⭐</span>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#a78bfa' }}>Enterprise Feature — Staff Management</div>
          <div style={{ fontSize:12, color:'#64748b' }}>Manage all PG employees, shifts, salaries and HR records in one place</div>
        </div>
        <span className="badge badge-purple" style={{ marginLeft:'auto', flexShrink:0 }}>Enterprise</span>
      </div>

      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        <div className="stat-card">
          <div className="stat-label">Total Staff</div>
          <div className="stat-value" style={{ color:'var(--accent)' }}>{stats?.total_active || 0}</div>
        </div>
        <div className="stat-card">
          <div className="stat-label">Monthly Payroll</div>
          <div className="stat-value" style={{ color:'var(--success)', fontSize:20 }}>
            ₹{(stats?.monthly_salary || 0).toLocaleString()}
          </div>
        </div>
        {(stats?.by_role || []).slice(0,2).map(r => (
          <div key={r.role} className="stat-card">
            <div className="stat-label" style={{ textTransform:'capitalize' }}>{r.role}s</div>
            <div className="stat-value">{r.count}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
          <button className={`filter-btn ${filter==='all'?'active':''}`} onClick={() => setFilter('all')}>All</button>
          {ROLES.map(r => (
            <button key={r} className={`filter-btn ${filter===r?'active':''}`}
              onClick={() => setFilter(r)} style={{ textTransform:'capitalize' }}>
              {ROLE_ICON[r]} {r}
            </button>
          ))}
        </div>
        <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add Staff</button>
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /><span>Loading staff…</span></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(300px,1fr))', gap:16 }}>
          {filtered.map(s => (
            <div key={s.id} className="card" style={{ padding:20 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:14 }}>
                <div style={{ display:'flex', alignItems:'center', gap:12 }}>
                  <div style={{
                    width:46, height:46, borderRadius:12, fontSize:22,
                    background:`${ROLE_COLOR[s.role] || '#6b7280'}18`,
                    border:`1.5px solid ${ROLE_COLOR[s.role] || '#6b7280'}40`,
                    display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0
                  }}>
                    {ROLE_ICON[s.role] || '👤'}
                  </div>
                  <div>
                    <div style={{ fontWeight:700, fontSize:15, color:'var(--text-1)' }}>{s.name}</div>
                    <div style={{ fontSize:12, color: ROLE_COLOR[s.role]||'var(--text-3)', textTransform:'capitalize', fontWeight:600 }}>
                      {s.role}
                    </div>
                  </div>
                </div>
                <span className={`badge ${s.status==='active'?'badge-success':'badge-gray'}`}
                  style={{ textTransform:'capitalize' }}>{s.status}</span>
              </div>

              <div style={{ display:'flex', flexDirection:'column', gap:6, marginBottom:14 }}>
                {s.phone && (
                  <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:13, color:'var(--text-2)' }}>
                    <span style={{ width:16 }}>📞</span> {s.phone}
                  </div>
                )}
                {s.email && (
                  <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:13, color:'var(--text-2)' }}>
                    <span style={{ width:16 }}>📧</span> {s.email}
                  </div>
                )}
                <div style={{ display:'flex', gap:8, alignItems:'center', fontSize:13, color:'var(--text-2)' }}>
                  <span style={{ width:16 }}>🕐</span>
                  <span style={{ textTransform:'capitalize' }}>{s.shift} shift</span>
                  {s.join_date && <span style={{ color:'var(--text-3)', marginLeft:'auto' }}>Since {s.join_date}</span>}
                </div>
              </div>

              <div style={{
                display:'flex', justifyContent:'space-between', alignItems:'center',
                padding:'10px 14px', background:'var(--bg-hover)', borderRadius:8, marginBottom:14
              }}>
                <span style={{ fontSize:12, color:'var(--text-3)' }}>Monthly Salary</span>
                <span style={{ fontWeight:800, fontSize:16, color:'var(--success)' }}>
                  ₹{Number(s.salary).toLocaleString()}
                </span>
              </div>

              {s.notes && (
                <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:12, fontStyle:'italic' }}>
                  {s.notes}
                </div>
              )}

              <div style={{ display:'flex', gap:8 }}>
                <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={() => openEdit(s)}>Edit</button>
                <button className="btn btn-danger btn-sm" style={{ flex:1 }} onClick={() => del(s.id)}>Remove</button>
              </div>
            </div>
          ))}
          {filtered.length === 0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', padding:60, color:'var(--text-3)' }}>
              No staff found.
            </div>
          )}
        </div>
      )}

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:580 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-1)' }}>
                {editing ? 'Edit Staff Member' : 'Add Staff Member'}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}
            <form onSubmit={submit}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Full Name</label>
                  <input name="name" value={form.name} onChange={handle} className="form-input" placeholder="Ramaiah K" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Role / Designation</label>
                  <select name="role" value={form.role} onChange={handle} className="form-input">
                    {ROLES.map(r => <option key={r} value={r}>{r.charAt(0).toUpperCase()+r.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Shift</label>
                  <select name="shift" value={form.shift} onChange={handle} className="form-input">
                    {SHIFTS.map(s => <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Phone</label>
                  <input name="phone" value={form.phone} onChange={handle} className="form-input" placeholder="9900000001" />
                </div>
                <div className="form-group">
                  <label className="form-label">Email</label>
                  <input name="email" type="email" value={form.email} onChange={handle} className="form-input" placeholder="staff@pg.com" />
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Salary (₹)</label>
                  <input name="salary" type="number" value={form.salary} onChange={handle} className="form-input" placeholder="12000" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Joining Date</label>
                  <input name="join_date" type="date" value={form.join_date} onChange={handle} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select name="status" value={form.status} onChange={handle} className="form-input">
                    <option value="active">Active</option>
                    <option value="inactive">Inactive</option>
                    <option value="on_leave">On Leave</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Notes (optional)</label>
                  <textarea name="notes" value={form.notes} onChange={handle} className="form-input" rows={2}
                    placeholder="Any notes about this staff member…" style={{ resize:'vertical' }} />
                </div>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Staff</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
