import React, { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';
import { api, exportCSV } from '../utils/api';

const FOOD_PREF = { veg:'🥦', nonveg:'🍗', jain:'🌿', vegan:'🌱' };
const FOOD_COLOR = { veg:'#22c55e', nonveg:'#ef4444', jain:'#8b5cf6', vegan:'#06b6d4' };

const EMPTY = {
  name:'', email:'', phone:'', room_id:'', occupation:'',
  id_proof_type:'Aadhar', id_proof_number:'', emergency_contact:'',
  move_in_date:'', photo_url:'', food_preference:'veg', is_away:0, away_until:'',
  password:'', confirm_password:''
};

export default function Residents() {
  const location = useLocation();
  const [residents, setResidents] = useState([]);
  const [rooms,     setRooms]     = useState([]);
  const [search,    setSearch]    = useState('');
  const [occ,       setOcc]       = useState('');
  const [foodFilter,setFoodFilter]= useState('');
  const [awayFilter,setAwayFilter]= useState(false);
  const [modal,     setModal]     = useState(false);
  const [form,      setForm]      = useState(EMPTY);
  const [editing,   setEditing]   = useState(null);
  const [error,     setError]     = useState('');
  const [loading,   setLoading]   = useState(true);

  const load = () => {
    const q = new URLSearchParams();
    if (search) q.set('search', search);
    if (occ)    q.set('occupation', occ);
    return Promise.all([api.getResidents(q.toString()), api.getRooms()])
      .then(([r, rm]) => { setResidents(r); setRooms(rm); })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [search, occ]);

  useEffect(() => {
    if (!location.state?.openId || loading) return;
    const r = residents.find(r => String(r.id) === String(location.state.openId));
    if (r) openEdit(r);
  }, [residents, loading, location.state]);

  const handle   = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const openNew  = () => { setForm(EMPTY); setEditing(null); setError(''); setModal(true); };
  const openEdit = r => {
    setForm({
      ...EMPTY, ...r,
      room_id: r.room_id || '',
      is_away: r.is_away || 0,
      food_preference: r.food_preference || 'veg',
      away_until: r.away_until || ''
    });
    setEditing(r.id); setError(''); setModal(true);
  };

  const submit = async e => {
    e.preventDefault(); setError('');
    if (!editing && form.password && form.password !== form.confirm_password) {
      setError('Passwords do not match'); return;
    }
    const payload = { ...form, room_id: form.room_id ? Number(form.room_id) : null, is_away: form.is_away ? 1 : 0 };
    delete payload.confirm_password;
    if (!payload.password) delete payload.password;
    try {
      if (editing) await api.updateResident(editing, payload);
      else         await api.createResident(payload);
      setModal(false); load();
    } catch (err) { setError(err.message); }
  };

  const del = async id => {
    if (!window.confirm('Remove this resident?')) return;
    try { await api.deleteResident(id); load(); } catch (err) { alert(err.message); }
  };

  const toggleAway = async (r) => {
    try {
      await api.updateResident(r.id, { is_away: r.is_away ? 0 : 1 });
      load();
    } catch (err) { alert(err.message); }
  };

  let displayed = foodFilter ? residents.filter(r => r.food_preference === foodFilter) : residents;
  if (awayFilter) displayed = displayed.filter(r => r.is_away);
  const awayCount = residents.filter(r => r.is_away).length;
  const foodCounts = Object.fromEntries(Object.keys(FOOD_PREF).map(k => [k, residents.filter(r => r.food_preference === k).length]));

  return (
    <>
      {/* Food stats strip */}
      <div style={{ display:'flex', gap:12, marginBottom:20, flexWrap:'wrap' }}>
        {Object.entries(FOOD_PREF).map(([key, icon]) => (
          <div key={key} className="stat-card" style={{ padding:'12px 18px', cursor:'pointer', flex:'1 1 120px',
            borderColor: foodFilter===key ? FOOD_COLOR[key] : 'var(--border)',
            background: foodFilter===key ? `${FOOD_COLOR[key]}12` : 'var(--bg-card)'
          }} onClick={() => setFoodFilter(f => f===key ? '' : key)}>
            <div style={{ fontSize:20 }}>{icon}</div>
            <div style={{ fontSize:11, color:'var(--text-3)', textTransform:'capitalize', marginTop:2 }}>{key}</div>
            <div style={{ fontSize:18, fontWeight:700, color: FOOD_COLOR[key] }}>{foodCounts[key]}</div>
          </div>
        ))}
        <div className="stat-card" style={{ padding:'12px 18px', flex:'1 1 120px' }}>
          <div style={{ fontSize:20 }}>✈️</div>
          <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>Away Now</div>
          <div style={{ fontSize:18, fontWeight:700, color:'var(--warning)' }}>{awayCount}</div>
        </div>
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap' }}>
          <input className="search-input" placeholder="Search name, email, phone…"
            value={search} onChange={e => setSearch(e.target.value)} style={{ minWidth:220 }} />
          <button className={`filter-btn ${awayFilter ? 'active' : ''}`} onClick={() => setAwayFilter(f => !f)}>
            ✈️ Away only
          </button>
        </div>
        <div style={{ display:'flex', gap:10 }}>
          <button className="btn btn-ghost btn-sm" onClick={() => exportCSV()}>Export CSV</button>
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add Resident</button>
        </div>
      </div>

      <div className="card" style={{ padding:0 }}>
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /><span>Loading residents…</span></div>
        ) : (
          <div className="table-wrap">
            <table className="pg-table">
              <thead>
                <tr>
                  <th>#</th><th>Resident</th><th>Contact</th>
                  <th>Room</th><th>Food</th><th>Occupation</th><th>Move-in</th><th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((r, i) => (
                  <tr key={r.id} style={{ opacity: r.is_away ? 0.7 : 1 }}>
                    <td style={{ color:'var(--text-3)', width:40 }}>{i+1}</td>
                    <td>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div className="avatar" style={{ width:34, height:34, fontSize:13, flexShrink:0,
                          background: r.is_away ? 'var(--bg-hover)' : undefined }}>
                          {r.name?.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <div style={{ fontWeight:600, color:'var(--text-1)', display:'flex', alignItems:'center', gap:6 }}>
                            {r.name}
                            {r.is_away && <span style={{ fontSize:10, background:'rgba(245,158,11,.15)', color:'#d97706', borderRadius:4, padding:'1px 5px', fontWeight:600 }}>AWAY</span>}
                          </div>
                          <div style={{ fontSize:11, color:'var(--text-3)' }}>
                            {r.id_proof_type}{r.id_proof_number ? ` · ${r.id_proof_number}` : ''}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td>
                      <div style={{ fontSize:13, color:'var(--text-2)' }}>{r.email}</div>
                      <div style={{ fontSize:12, color:'var(--text-3)' }}>{r.phone}</div>
                    </td>
                    <td>
                      {r.room_number
                        ? <span className="badge badge-info">Room {r.room_number}</span>
                        : <span style={{ color:'var(--text-3)' }}>—</span>}
                    </td>
                    <td>
                      <span style={{
                        display:'inline-flex', alignItems:'center', gap:4,
                        fontSize:12, fontWeight:600, padding:'3px 8px', borderRadius:6,
                        background: `${FOOD_COLOR[r.food_preference]||'#6b7280'}15`,
                        color: FOOD_COLOR[r.food_preference] || '#6b7280'
                      }}>
                        {FOOD_PREF[r.food_preference]||'❓'} {r.food_preference||'veg'}
                      </span>
                    </td>
                    <td style={{ fontSize:12, color:'var(--text-2)' }}>
                      {r.occupation || '—'}
                    </td>
                    <td style={{ color:'var(--text-3)', fontSize:12 }}>{r.move_in_date}</td>
                    <td>
                      <div style={{ display:'flex', gap:6 }}>
                        <button className={`btn btn-xs ${r.is_away ? 'btn-warning' : 'btn-ghost'}`}
                          onClick={() => toggleAway(r)} title={r.is_away ? 'Mark present' : 'Mark away'}>
                          {r.is_away ? '🏠' : '✈️'}
                        </button>
                        <button className="btn btn-ghost btn-xs" onClick={() => openEdit(r)}>Edit</button>
                        <button className="btn btn-danger btn-xs" onClick={() => del(r.id)}>Remove</button>
                      </div>
                    </td>
                  </tr>
                ))}
                {displayed.length === 0 && (
                  <tr>
                    <td colSpan={8} style={{ textAlign:'center', padding:48, color:'var(--text-3)' }}>
                      No residents found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ marginTop:8, color:'var(--text-3)', fontSize:12 }}>
        {displayed.length} resident{displayed.length !== 1 ? 's' : ''}
        {awayCount > 0 && <span style={{ color:'var(--warning)', marginLeft:12 }}>· {awayCount} away</span>}
        {foodFilter && <span style={{ color: FOOD_COLOR[foodFilter], marginLeft:12 }}>· filtered: {foodFilter}</span>}
      </div>

      {/* Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:660 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-1)' }}>
                {editing ? 'Edit Resident' : 'Add New Resident'}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}

            <form onSubmit={submit}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Full Name *</label>
                  <input name="name" type="text" value={form.name} onChange={handle}
                    className="form-input" placeholder="Arjun Sharma" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Email Address {!editing && <span style={{ color:'var(--text-3)', fontWeight:400 }}>(used for login)</span>}</label>
                  <input name="email" type="email" value={form.email} onChange={handle}
                    className="form-input" placeholder="arjun@gmail.com" />
                </div>
                {!editing && (
                  <>
                    <div className="form-group">
                      <label className="form-label">
                        Login Password
                        <span style={{ color:'var(--text-3)', fontWeight:400, marginLeft:4 }}>(optional — gives portal access)</span>
                      </label>
                      <input name="password" type="password" value={form.password} onChange={handle}
                        className="form-input" placeholder="Min 6 characters" />
                    </div>
                    <div className="form-group">
                      <label className="form-label">Confirm Password</label>
                      <input name="confirm_password" type="password" value={form.confirm_password} onChange={handle}
                        className="form-input" placeholder="Repeat password" />
                    </div>
                  </>
                )}
                <div className="form-group">
                  <label className="form-label">Phone Number</label>
                  <input name="phone" type="tel" value={form.phone} onChange={handle}
                    className="form-input" placeholder="9876543210" />
                </div>

                <div className="form-group">
                  <label className="form-label">Assign Room</label>
                  <select name="room_id" value={form.room_id} onChange={handle} className="form-input">
                    <option value="">— Not Assigned —</option>
                    {rooms.filter(r => r.status !== 'maintenance').map(r => (
                      <option key={r.id} value={r.id}>
                        Room {r.room_number} ({r.type}) — ₹{r.rent_amount}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Occupation</label>
                  <input name="occupation" type="text" value={form.occupation} onChange={handle}
                    className="form-input" placeholder="e.g. Software Engineer, MBA Student, Teacher…" />
                </div>

                <div className="form-group">
                  <label className="form-label">Food Preference</label>
                  <select name="food_preference" value={form.food_preference} onChange={handle} className="form-input">
                    {Object.entries(FOOD_PREF).map(([k,icon]) => (
                      <option key={k} value={k}>{icon} {k.charAt(0).toUpperCase()+k.slice(1)}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Away Status</label>
                  <select name="is_away" value={form.is_away} onChange={handle} className="form-input">
                    <option value={0}>Present at PG</option>
                    <option value={1}>Away / Not Available</option>
                  </select>
                </div>

                {Number(form.is_away) === 1 && (
                  <div className="form-group">
                    <label className="form-label">Away Until (Date)</label>
                    <input name="away_until" type="date" value={form.away_until} onChange={handle} className="form-input" />
                  </div>
                )}

                <div className="form-group">
                  <label className="form-label">ID Proof Type</label>
                  <select name="id_proof_type" value={form.id_proof_type} onChange={handle} className="form-input">
                    {['Aadhar','Passport','Driving License','Voter ID','PAN Card'].map(p => (
                      <option key={p} value={p}>{p}</option>
                    ))}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">ID Proof Number</label>
                  <input name="id_proof_number" type="text" value={form.id_proof_number} onChange={handle}
                    className="form-input" placeholder="XXXX XXXX XXXX" />
                </div>

                <div className="form-group">
                  <label className="form-label">Move-in Date</label>
                  <input name="move_in_date" type="date" value={form.move_in_date} onChange={handle} className="form-input" />
                </div>
                <div className="form-group">
                  <label className="form-label">Emergency Contact</label>
                  <input name="emergency_contact" type="text" value={form.emergency_contact} onChange={handle}
                    className="form-input" placeholder="Father: 9999123456" />
                </div>
              </div>

              <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Resident</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
