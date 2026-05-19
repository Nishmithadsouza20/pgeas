import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const EMPTY = { room_number:'', floor:'1', type:'single', rent_amount:'', amenities:'', status:'vacant', photo_url:'' };
const TYPE_MAX  = { single:1, double:2, triple:3 };
const TYPE_ICON = { single:'🛏️', double:'🛏🛏', triple:'🛏🛏🛏' };
const STATUS_CLR = { vacant:'var(--success)', occupied:'var(--danger)', maintenance:'var(--warning)' };
const STATUS_BG  = { vacant:'rgba(34,197,94,.09)', occupied:'rgba(239,68,68,.09)', maintenance:'rgba(245,158,11,.09)' };
const FOOD_COLOR = { veg:'#22c55e', nonveg:'#ef4444', jain:'#8b5cf6', vegan:'#06b6d4' };
const FOOD_ICON  = { veg:'🥦', nonveg:'🍗', jain:'🌿', vegan:'🌱' };

export default function Rooms() {
  const navigate = useNavigate();
  const [rooms,        setRooms]        = useState([]);
  const [stats,        setStats]        = useState({});
  const [unassigned,   setUnassigned]   = useState([]);
  const [modal,        setModal]        = useState(false);
  const [form,         setForm]         = useState(EMPTY);
  const [editing,      setEditing]      = useState(null);
  const [error,        setError]        = useState('');
  const [filter,       setFilter]       = useState('all');
  const [view,         setView]         = useState('grid');
  const [loading,      setLoading]      = useState(true);

  // Per-bed management state
  const [bedModal,     setBedModal]     = useState(null);  // { room, residentId, residentName, slotIndex }
  const [assignModal,  setAssignModal]  = useState(null);  // { room, slotIndex }
  const [assignSel,    setAssignSel]    = useState('');
  const [bedLoading,   setBedLoading]   = useState(false);

  const load = () => Promise.all([api.getRooms(), api.getRoomStats(), api.getUnassigned()])
    .then(([r, s, u]) => { setRooms(r); setStats(s); setUnassigned(u); })
    .catch(console.error)
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const handle   = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const openNew  = () => { setForm(EMPTY); setEditing(null); setError(''); setModal(true); };
  const openEdit = r => { setForm({ ...r, floor: String(r.floor) }); setEditing(r.id); setError(''); setModal(true); };

  const submit = async e => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, floor: Number(form.floor), rent_amount: Number(form.rent_amount) };
      if (editing) await api.updateRoom(editing, payload);
      else         await api.createRoom(payload);
      setModal(false); load();
    } catch (err) { setError(err.message); }
  };

  const del = async id => {
    if (!window.confirm('Delete this room?')) return;
    try { await api.deleteRoom(id); load(); } catch (err) { alert(err.message); }
  };

  // Remove a resident from a room (unassign)
  const removeFromRoom = async (residentId) => {
    setBedLoading(true);
    try {
      await api.updateResident(residentId, { room_id: null });
      setBedModal(null);
      load();
    } catch (err) { alert(err.message); }
    finally { setBedLoading(false); }
  };

  // Assign an unassigned resident to a room
  const assignToRoom = async () => {
    if (!assignSel) return;
    setBedLoading(true);
    try {
      await api.updateResident(Number(assignSel), { room_id: assignModal.room.id });
      setAssignModal(null); setAssignSel('');
      load();
    } catch (err) { alert(err.message); }
    finally { setBedLoading(false); }
  };

  const filtered = filter === 'all' ? rooms : rooms.filter(r => r.status === filter);
  const occupancyPct = stats.total ? Math.round((stats.occupied / stats.total) * 100) : 0;

  return (
    <>
      {/* KPI strip */}
      <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr 1fr 1fr', gap:14, marginBottom:24 }}>
        <div className="stat-card">
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:10 }}>
            <div className="stat-label">Occupancy Rate</div>
            <span style={{ fontSize:13, fontWeight:700, color: occupancyPct > 75 ? 'var(--success)' : 'var(--warning)' }}>
              {occupancyPct}%
            </span>
          </div>
          <div style={{ height:8, background:'var(--bg-hover)', borderRadius:4, overflow:'hidden' }}>
            <div style={{ height:'100%', width:`${occupancyPct}%`, background:'linear-gradient(90deg,var(--accent),#ff9a6c)', borderRadius:4, transition:'width 0.5s' }} />
          </div>
          <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:12, color:'var(--text-3)' }}>
            <span>{stats.occupied || 0} occupied of {stats.total || 0} rooms</span>
            <span>{stats.vacant || 0} vacant</span>
          </div>
        </div>
        {[
          { label:'Vacant',      value: stats.vacant      || 0, color:'var(--success)', icon:'✅' },
          { label:'Occupied',    value: stats.occupied    || 0, color:'var(--danger)',  icon:'🔴' },
          { label:'Maintenance', value: stats.maintenance || 0, color:'var(--warning)', icon:'🔧' },
        ].map(s => (
          <div key={s.label} className="stat-card">
            <div style={{ fontSize:22, marginBottom:6 }}>{s.icon}</div>
            <div className="stat-label">{s.label}</div>
            <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Toolbar */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:8, flexWrap:'wrap', alignItems:'center' }}>
          {['all','vacant','occupied','maintenance'].map(f => (
            <button key={f} className={`filter-btn ${filter === f ? 'active' : ''}`} onClick={() => setFilter(f)}>
              {f === 'all' ? `All (${rooms.length})` : `${f.charAt(0).toUpperCase()+f.slice(1)} (${rooms.filter(r=>r.status===f).length})`}
            </button>
          ))}
        </div>
        <div style={{ display:'flex', gap:8 }}>
          <div style={{ display:'flex', border:'1px solid var(--border)', borderRadius:8, overflow:'hidden' }}>
            {[['grid','⊞ Grid'],['table','≡ List']].map(([v,label]) => (
              <button key={v} onClick={() => setView(v)} style={{
                padding:'6px 14px', border:'none', cursor:'pointer', fontSize:13,
                background: view===v ? 'var(--accent)' : 'transparent',
                color: view===v ? '#fff' : 'var(--text-2)',
              }}>{label}</button>
            ))}
          </div>
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add Room</button>
        </div>
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /><span>Loading rooms…</span></div>
      ) : view === 'grid' ? (

        /* ── GRID VIEW ── */
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill, minmax(300px,1fr))', gap:16 }}>
          {filtered.map(r => {
            const residents  = r.resident_names ? r.resident_names.split(' | ').filter(Boolean) : [];
            const resIds     = r.resident_ids   ? r.resident_ids.split(' | ').filter(Boolean)   : [];
            const resPhones  = r.resident_phones? r.resident_phones.split(' | ').filter(Boolean): [];
            const maxSlots   = TYPE_MAX[r.type] || 1;
            const freeSlots  = maxSlots - residents.length;

            return (
              <div key={r.id} className="card" style={{ padding:0, overflow:'hidden', display:'flex', flexDirection:'column' }}>
                {/* Room header */}
                <div style={{
                  padding:'16px 18px 12px', background: STATUS_BG[r.status],
                  borderBottom:'1px solid var(--border)',
                  display:'flex', justifyContent:'space-between', alignItems:'flex-start'
                }}>
                  <div>
                    <div style={{ display:'flex', alignItems:'center', gap:8, marginBottom:3 }}>
                      <span style={{ fontSize:15 }}>{TYPE_ICON[r.type] || '🛏️'}</span>
                      <div style={{ fontSize:20, fontWeight:800, color:'var(--text-1)' }}>Room {r.room_number}</div>
                    </div>
                    <div style={{ color:'var(--text-3)', fontSize:12 }}>
                      Floor {r.floor} · {r.type?.charAt(0).toUpperCase()+r.type?.slice(1)} · {maxSlots} bed{maxSlots>1?'s':''}
                    </div>
                  </div>
                  <div style={{ textAlign:'right' }}>
                    <div style={{
                      display:'inline-block', padding:'3px 10px', borderRadius:20,
                      fontSize:11, fontWeight:700, textTransform:'capitalize',
                      background: STATUS_BG[r.status], color: STATUS_CLR[r.status],
                      border:`1px solid ${STATUS_CLR[r.status]}50`
                    }}>{r.status}</div>
                    <div style={{ fontSize:18, fontWeight:800, color:'var(--accent)', marginTop:6 }}>
                      ₹{r.rent_amount?.toLocaleString()}
                      <span style={{ fontSize:10, fontWeight:400, color:'var(--text-3)' }}>/mo</span>
                    </div>
                  </div>
                </div>

                {/* Bed slots */}
                <div style={{ padding:'14px 18px', flex:1 }}>
                  <div style={{ fontSize:11, color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5, marginBottom:10 }}>
                    Beds — {residents.length}/{maxSlots} occupied
                  </div>

                  {/* Occupied beds */}
                  {residents.map((name, i) => (
                    <div key={i}
                      onClick={() => setBedModal({ room:r, residentId:resIds[i], residentName:name, residentPhone:resPhones[i] })}
                      style={{
                        display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                        background:'var(--bg-hover)', borderRadius:10, marginBottom:8,
                        cursor:'pointer', transition:'all 0.15s',
                        border:'1px solid transparent',
                      }}
                      onMouseEnter={e => e.currentTarget.style.borderColor='var(--accent)'}
                      onMouseLeave={e => e.currentTarget.style.borderColor='transparent'}
                    >
                      <div className="avatar" style={{ width:32, height:32, fontSize:13, flexShrink:0 }}>
                        {name.charAt(0).toUpperCase()}
                      </div>
                      <div style={{ flex:1, minWidth:0 }}>
                        <div style={{ fontWeight:600, fontSize:13, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{name}</div>
                        {resPhones[i] && <div style={{ fontSize:11, color:'var(--text-3)' }}>{resPhones[i]}</div>}
                      </div>
                      <div style={{ display:'flex', alignItems:'center', gap:6, flexShrink:0 }}>
                        <span style={{ fontSize:10, color:'var(--success)', fontWeight:700 }}>● Active</span>
                        <span style={{ fontSize:12, color:'var(--text-3)' }}>›</span>
                      </div>
                    </div>
                  ))}

                  {/* Empty slots — click to assign */}
                  {Array.from({ length: freeSlots }).map((_, i) => (
                    <div key={`empty-${i}`}
                      onClick={() => { setAssignModal({ room:r }); setAssignSel(''); }}
                      style={{
                        display:'flex', alignItems:'center', gap:10, padding:'9px 12px',
                        border:'1.5px dashed var(--border)', borderRadius:10, marginBottom:8,
                        cursor:'pointer', opacity:0.7, transition:'all 0.15s',
                      }}
                      onMouseEnter={e => { e.currentTarget.style.opacity='1'; e.currentTarget.style.borderColor='var(--accent)'; }}
                      onMouseLeave={e => { e.currentTarget.style.opacity='0.7'; e.currentTarget.style.borderColor='var(--border)'; }}
                    >
                      <div style={{ width:32, height:32, borderRadius:'50%', border:'1.5px dashed var(--border)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:16, color:'var(--text-3)', flexShrink:0 }}>+</div>
                      <div style={{ fontSize:12, color:'var(--text-3)' }}>Empty bed — click to assign resident</div>
                    </div>
                  ))}

                  {/* Amenities */}
                  {r.amenities && (
                    <div style={{ marginTop:10, display:'flex', flexWrap:'wrap', gap:5 }}>
                      {r.amenities.split(',').map(a => (
                        <span key={a} style={{ background:'var(--bg-hover)', color:'var(--text-2)', padding:'2px 8px', borderRadius:10, fontSize:11, fontWeight:500 }}>
                          {a.trim()}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div style={{ padding:'10px 18px', borderTop:'1px solid var(--border)', display:'flex', gap:8 }}>
                  <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={() => openEdit(r)}>Edit Room</button>
                  <button className="btn btn-danger btn-sm" style={{ flex:1 }} onClick={() => del(r.id)}>Delete</button>
                </div>
              </div>
            );
          })}
          {filtered.length === 0 && (
            <div style={{ gridColumn:'1/-1', textAlign:'center', padding:60, color:'var(--text-3)' }}>
              No rooms found for this filter.
            </div>
          )}
        </div>

      ) : (
        /* ── TABLE VIEW ── */
        <div className="card" style={{ padding:0 }}>
          <div className="table-wrap">
            <table className="pg-table">
              <thead>
                <tr><th>Room</th><th>Floor</th><th>Type</th><th>Rent</th><th>Status</th><th>Residents</th><th>Amenities</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {filtered.map(r => {
                  const residents = r.resident_names ? r.resident_names.split(' | ').filter(Boolean) : [];
                  const resIds    = r.resident_ids   ? r.resident_ids.split(' | ').filter(Boolean)   : [];
                  return (
                    <tr key={r.id}>
                      <td style={{ fontWeight:800, color:'var(--accent)', fontSize:15 }}>{r.room_number}</td>
                      <td style={{ color:'var(--text-2)' }}>Floor {r.floor}</td>
                      <td style={{ textTransform:'capitalize' }}>{TYPE_ICON[r.type]} {r.type}</td>
                      <td style={{ fontWeight:700 }}>₹{r.rent_amount?.toLocaleString()}</td>
                      <td>
                        <span style={{
                          padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                          background: STATUS_BG[r.status], color: STATUS_CLR[r.status],
                          border:`1px solid ${STATUS_CLR[r.status]}50`, textTransform:'capitalize'
                        }}>{r.status}</span>
                      </td>
                      <td>
                        {residents.length > 0 ? (
                          <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                            {residents.map((name, i) => (
                              <div key={i}
                                onClick={() => setBedModal({ room:r, residentId:resIds[i], residentName:name })}
                                style={{ display:'flex', alignItems:'center', gap:5, cursor:'pointer', padding:'2px 8px', borderRadius:8, background:'var(--bg-hover)', border:'1px solid var(--border)' }}
                              >
                                <div className="avatar" style={{ width:20, height:20, fontSize:9 }}>{name.charAt(0)}</div>
                                <span style={{ fontSize:12, fontWeight:600 }}>{name}</span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <button className="btn btn-ghost btn-xs" onClick={() => { setAssignModal({ room:r }); setAssignSel(''); }}>
                            + Assign
                          </button>
                        )}
                      </td>
                      <td style={{ fontSize:12, color:'var(--text-3)', maxWidth:160 }}>{r.amenities || '—'}</td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-ghost btn-xs" onClick={() => openEdit(r)}>Edit</button>
                          <button className="btn btn-danger btn-xs" onClick={() => del(r.id)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {filtered.length === 0 && (
                  <tr><td colSpan={8} style={{ textAlign:'center', padding:48, color:'var(--text-3)' }}>No rooms.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ── ROOM FORM MODAL ── */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:540 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-1)' }}>
                {editing ? 'Edit Room' : 'Add New Room'}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}
            <form onSubmit={submit}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">Room Number *</label>
                  <input name="room_number" type="text" value={form.room_number} onChange={handle} className="form-input" placeholder="101" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Floor *</label>
                  <input name="floor" type="number" value={form.floor} onChange={handle} className="form-input" placeholder="1" min="1" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Room Type</label>
                  <select name="type" value={form.type} onChange={handle} className="form-input">
                    <option value="single">Single (1 bed)</option>
                    <option value="double">Double (2 beds)</option>
                    <option value="triple">Triple (3 beds)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Monthly Rent (₹) *</label>
                  <input name="rent_amount" type="number" value={form.rent_amount} onChange={handle} className="form-input" placeholder="7500" required />
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Amenities</label>
                  <input name="amenities" type="text" value={form.amenities} onChange={handle} className="form-input" placeholder="AC, WiFi, Attached Bathroom, Geyser" />
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Status</label>
                  <select name="status" value={form.status} onChange={handle} className="form-input">
                    <option value="vacant">Vacant</option>
                    <option value="occupied">Occupied</option>
                    <option value="maintenance">Under Maintenance</option>
                  </select>
                </div>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Room</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── BED RESIDENT MODAL ── */}
      {bedModal && (
        <div className="modal-overlay" onClick={() => setBedModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:380 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--text-1)' }}>Resident in Room {bedModal.room.room_number}</div>
                <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>Manage this bed assignment</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setBedModal(null)}>✕</button>
            </div>

            <div style={{ display:'flex', alignItems:'center', gap:14, padding:'14px 16px', background:'var(--bg-hover)', borderRadius:12, marginBottom:20 }}>
              <div className="avatar" style={{ width:48, height:48, fontSize:20 }}>
                {bedModal.residentName?.charAt(0)}
              </div>
              <div>
                <div style={{ fontWeight:700, fontSize:15, color:'var(--text-1)' }}>{bedModal.residentName}</div>
                {bedModal.residentPhone && <div style={{ fontSize:12, color:'var(--text-3)', marginTop:3 }}>📞 {bedModal.residentPhone}</div>}
                <div style={{ fontSize:12, color:'var(--success)', marginTop:3 }}>● Active resident</div>
              </div>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
              <button
                className="btn btn-ghost"
                style={{ justifyContent:'flex-start', gap:10 }}
                onClick={() => { setBedModal(null); navigate('/residents', { state: { openId: bedModal.residentId } }); }}
              >
                👤 View Full Profile
              </button>
              <button
                className="btn btn-danger"
                style={{ justifyContent:'flex-start', gap:10 }}
                disabled={bedLoading}
                onClick={() => {
                  if (window.confirm(`Remove ${bedModal.residentName} from Room ${bedModal.room.room_number}? They will be unassigned but not deleted.`)) {
                    removeFromRoom(bedModal.residentId);
                  }
                }}
              >
                🚪 {bedLoading ? 'Removing…' : 'Remove from This Room'}
              </button>
            </div>

            <div style={{ marginTop:14, fontSize:11, color:'var(--text-3)', textAlign:'center' }}>
              Removing unassigns the resident — they stay in the system and can be assigned to another room.
            </div>
          </div>
        </div>
      )}

      {/* ── ASSIGN RESIDENT MODAL ── */}
      {assignModal && (
        <div className="modal-overlay" onClick={() => setAssignModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:400 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:16, fontWeight:700, color:'var(--text-1)' }}>Assign Resident</div>
                <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>Room {assignModal.room.room_number} · Empty bed</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setAssignModal(null)}>✕</button>
            </div>

            {unassigned.length === 0 ? (
              <div style={{ textAlign:'center', padding:'20px 0', color:'var(--text-3)' }}>
                No unassigned residents available.<br />
                <span style={{ fontSize:12 }}>Add a resident first from the Residents page.</span>
              </div>
            ) : (
              <>
                <div className="form-group" style={{ marginBottom:16 }}>
                  <label className="form-label">Select Resident ({unassigned.length} available)</label>
                  <select value={assignSel} onChange={e => setAssignSel(e.target.value)} className="form-input">
                    <option value="">— Choose a resident —</option>
                    {unassigned.map(u => (
                      <option key={u.id} value={u.id}>
                        {u.name} {u.food_preference ? `· ${u.food_preference}` : ''}
                      </option>
                    ))}
                  </select>
                </div>

                {assignSel && (() => {
                  const sel = unassigned.find(u => String(u.id) === String(assignSel));
                  return sel ? (
                    <div style={{ padding:'12px 14px', background:'var(--bg-hover)', borderRadius:10, marginBottom:16, display:'flex', alignItems:'center', gap:12 }}>
                      <div className="avatar" style={{ width:36, height:36, fontSize:14 }}>{sel.name.charAt(0)}</div>
                      <div>
                        <div style={{ fontWeight:700, fontSize:14 }}>{sel.name}</div>
                        <div style={{ fontSize:12, color:'var(--text-3)' }}>
                          {sel.phone && `📞 ${sel.phone} · `}
                          {sel.food_preference && `${FOOD_ICON[sel.food_preference]||''} ${sel.food_preference}`}
                        </div>
                      </div>
                    </div>
                  ) : null;
                })()}

                <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                  <button className="btn btn-ghost" onClick={() => setAssignModal(null)}>Cancel</button>
                  <button className="btn btn-primary" disabled={!assignSel || bedLoading} onClick={assignToRoom}>
                    {bedLoading ? 'Assigning…' : 'Assign to Room'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}
