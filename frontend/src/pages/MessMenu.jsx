import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';

const DAYS  = ['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'];
const MEALS = ['Breakfast','Lunch','Dinner'];
const EMPTY = { day_of_week:'Monday', meal_type:'Breakfast', items:'', timing:'', special_note:'', week_number:1 };
const MEAL_COLOR = { Breakfast:'#3b82f6', Lunch:'#22c55e', Dinner:'#8b5cf6' };

export default function MessMenu() {
  const { user }  = useAuth();
  const toast     = useToast();
  const isAdmin   = ['super_admin','owner'].includes(user?.role);

  const [menu,    setMenu]    = useState([]);
  const [today,   setToday]   = useState(null);
  const [week,    setWeek]    = useState(1);
  const [modal,   setModal]   = useState(false);
  const [form,    setForm]    = useState(EMPTY);
  const [editing, setEditing] = useState(null);
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);

  const load = () => Promise.all([api.getMenu(week), api.getTodayMenu()])
    .then(([m, t]) => { setMenu(m); setToday(t); })
    .catch(console.error)
    .finally(() => setLoading(false));

  useEffect(() => { load(); }, [week]);

  const handle   = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const openNew  = () => { setForm({...EMPTY, week_number: week}); setEditing(null); setError(''); setModal(true); };
  const openEdit = m => { setForm({...m}); setEditing(m.id); setError(''); setModal(true); };

  const submit = async e => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...form, week_number: Number(form.week_number) };
      if (editing) await api.updateMenuItem(editing, payload);
      else         await api.createMenuItem(payload);
      setModal(false); load();
    } catch(err) { setError(err.message); }
  };

  const del = async id => {
    if (!window.confirm('Delete this menu item?')) return;
    try { await api.deleteMenuItem(id); load(); toast.success('Menu item deleted'); } catch(err) { toast.error(err.message); }
  };

  const grouped = DAYS.reduce((acc, day) => {
    acc[day] = MEALS.reduce((ma, meal) => {
      ma[meal] = menu.find(m => m.day_of_week === day && m.meal_type === meal) || null;
      return ma;
    }, {});
    return acc;
  }, {});

  return (
    <>
      {/* Today's highlight */}
      {today && (
        <div className="card" style={{ padding:20, marginBottom:20, borderLeft:'3px solid var(--accent)' }}>
          <div style={{ fontWeight:700, color:'var(--accent)', marginBottom:14, fontSize:15 }}>
            Today — {today.day}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fit,minmax(180px,1fr))', gap:12 }}>
            {(today.menu||[]).map((m, i) => (
              <div key={i} style={{ background:'var(--bg-hover)', borderRadius:10, padding:14 }}>
                <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1,
                  color: MEAL_COLOR[m.meal_type]||'var(--accent)', marginBottom:6 }}>
                  {m.meal_type}{m.timing ? ` · ${m.timing}` : ''}
                </div>
                <div style={{ fontSize:13, color:'var(--text-1)', lineHeight:1.5 }}>{m.items}</div>
                {m.special_note && (
                  <div style={{ fontSize:11, color:'var(--accent)', marginTop:6 }}>★ {m.special_note}</div>
                )}
              </div>
            ))}
            {(today.menu||[]).length === 0 && (
              <div style={{ color:'var(--text-3)', fontSize:13 }}>No menu scheduled for today.</div>
            )}
          </div>
        </div>
      )}

      {/* Week selector + Add */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:8 }}>
          {[1, 2].map(w => (
            <button key={w} className={`filter-btn ${week===w?'active':''}`} onClick={() => setWeek(w)}>
              Week {w}
            </button>
          ))}
        </div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add Menu Item</button>
        )}
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /><span>Loading menu…</span></div>
      ) : (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
          {DAYS.map(day => (
            <div key={day} className="card" style={{ padding:18 }}>
              <div style={{ fontWeight:700, color:'var(--accent)', marginBottom:14, fontSize:14 }}>{day}</div>
              {MEALS.map(meal => {
                const item = grouped[day][meal];
                return (
                  <div key={meal} style={{
                    marginBottom:10, padding:'10px 12px',
                    background:'var(--bg-hover)', borderRadius:8
                  }}>
                    <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                      <div style={{ flex:1 }}>
                        <div style={{ fontSize:10, fontWeight:700, textTransform:'uppercase', letterSpacing:1,
                          color: MEAL_COLOR[meal], marginBottom:4 }}>
                          {meal}{item?.timing ? ` · ${item.timing}` : ''}
                        </div>
                        {item ? (
                          <>
                            <div style={{ fontSize:12, color:'var(--text-1)', lineHeight:1.5 }}>{item.items}</div>
                            {item.special_note && (
                              <div style={{ fontSize:11, color:'var(--accent)', marginTop:4 }}>★ {item.special_note}</div>
                            )}
                          </>
                        ) : (
                          <div style={{ fontSize:12, color:'var(--text-3)', fontStyle:'italic' }}>Not scheduled</div>
                        )}
                      </div>
                      {isAdmin && item && (
                        <div style={{ display:'flex', gap:4, marginLeft:8, flexShrink:0 }}>
                          <button className="btn btn-ghost btn-xs" onClick={() => openEdit(item)}>✏</button>
                          <button className="btn btn-danger btn-xs" onClick={() => del(item.id)}>✕</button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
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
                {editing ? 'Edit Menu Item' : 'Add Menu Item'}
              </h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}

            <form onSubmit={submit}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">Day</label>
                  <select name="day_of_week" value={form.day_of_week} onChange={handle} className="form-input">
                    {DAYS.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Meal</label>
                  <select name="meal_type" value={form.meal_type} onChange={handle} className="form-input">
                    {MEALS.map(m => <option key={m} value={m}>{m}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Timing</label>
                  <input name="timing" value={form.timing} onChange={handle}
                    className="form-input" placeholder="7:30 AM - 9:00 AM" />
                </div>
                <div className="form-group">
                  <label className="form-label">Week</label>
                  <select name="week_number" value={form.week_number} onChange={handle} className="form-input">
                    <option value={1}>Week 1</option>
                    <option value={2}>Week 2</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Menu Items</label>
                  <textarea name="items" value={form.items} onChange={handle}
                    className="form-input" rows={3}
                    placeholder="Idli, Sambar, Coconut Chutney, Tea" required
                    style={{ resize:'vertical' }} />
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Special Note (optional)</label>
                  <input name="special_note" value={form.special_note} onChange={handle}
                    className="form-input" placeholder="Special Friday Biryani!" />
                </div>
              </div>

              <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
