import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

const MEAL_CFG = {
  breakfast: { icon: '🌅', label: 'Breakfast', color: '#f59e0b' },
  lunch:     { icon: '☀️',  label: 'Lunch',     color: '#22c55e' },
  dinner:    { icon: '🌙', label: 'Dinner',    color: '#6366f1' },
};

function today() {
  return new Date().toISOString().split('T')[0];
}

export default function MealAttendance() {
  const [tab,      setTab]      = useState('daily');
  const [date,     setDate]     = useState(today());
  const [month,    setMonth]    = useState(new Date().getMonth() + 1);
  const [year,     setYear]     = useState(new Date().getFullYear());
  const [daily,    setDaily]    = useState({ residents: [], settings: {} });
  const [monthly,  setMonthly]  = useState({ residents: [], settings: {}, days_in_month: 30 });
  const [edits,    setEdits]    = useState({});
  const [settings, setSettings] = useState({ breakfast_rate: 30, lunch_rate: 50, dinner_rate: 50 });
  const [showRate, setShowRate] = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);

  const loadDaily = async () => {
    setLoading(true);
    const d = await api.getMealAttendance(date).catch(() => ({ residents: [], settings: {} }));
    setDaily(d);
    if (d.settings) setSettings(d.settings);
    const init = {};
    (d.residents || []).forEach(r => {
      init[r.resident_id] = { breakfast: !!r.breakfast, lunch: !!r.lunch, dinner: !!r.dinner };
    });
    setEdits(init);
    setLoading(false);
  };

  const loadMonthly = async () => {
    setLoading(true);
    const d = await api.getMealMonthly(month, year).catch(() => ({ residents: [], settings: {}, days_in_month: 30 }));
    setMonthly(d);
    if (d.settings) setSettings(d.settings);
    setLoading(false);
  };

  useEffect(() => { if (tab === 'daily') loadDaily(); }, [date, tab]);
  useEffect(() => { if (tab === 'monthly') loadMonthly(); }, [month, year, tab]);

  const toggle = (rid, meal) => {
    setEdits(e => ({ ...e, [rid]: { ...e[rid], [meal]: !e[rid]?.[meal] } }));
  };

  const markAll = (meal, val) => {
    setEdits(e => {
      const next = { ...e };
      (daily.residents || []).forEach(r => { next[r.resident_id] = { ...next[r.resident_id], [meal]: val }; });
      return next;
    });
  };

  const saveAll = async () => {
    setSaving(true);
    const records = (daily.residents || []).map(r => ({
      resident_id:   r.resident_id,
      resident_name: r.resident_name,
      room_number:   r.room_number,
      date,
      breakfast: edits[r.resident_id]?.breakfast ?? true,
      lunch:     edits[r.resident_id]?.lunch     ?? true,
      dinner:    edits[r.resident_id]?.dinner     ?? true,
    }));
    await api.saveMealAttendance(records).catch(console.error);
    setSaving(false);
  };

  const saveSettings = async () => {
    await api.updateMealSettings(settings).catch(console.error);
    setShowRate(false);
    if (tab === 'daily') loadDaily(); else loadMonthly();
  };

  // Stats for daily view
  const totalRes   = (daily.residents || []).length;
  const bCount     = Object.values(edits).filter(e => e.breakfast).length;
  const lCount     = Object.values(edits).filter(e => e.lunch).length;
  const dCount     = Object.values(edits).filter(e => e.dinner).length;
  const dailyCost  = bCount * (settings.breakfast_rate||0) + lCount * (settings.lunch_rate||0) + dCount * (settings.dinner_rate||0);

  // Stats for monthly
  const totalMealCost = (monthly.residents || []).reduce((a, r) => a + (r.meal_cost || 0), 0);

  return (
    <div>
      {/* Tabs + Controls */}
      <div style={{ display:'flex', gap:10, marginBottom:20, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ display:'flex', background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
          {[['daily','Daily View'],['monthly','Monthly Summary']].map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)} className={`btn btn-sm ${tab===v?'btn-primary':'btn-ghost'}`}
              style={{ borderRadius:0, padding:'8px 16px' }}>{l}</button>
          ))}
        </div>

        {tab === 'daily' && (
          <input type="date" value={date} onChange={e => setDate(e.target.value)} className="form-input" style={{ width:160 }} />
        )}
        {tab === 'monthly' && (
          <>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="form-input" style={{ width:110 }}>
              {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="form-input" style={{ width:90 }} />
          </>
        )}

        <button className="btn btn-ghost btn-sm" onClick={() => setShowRate(true)} style={{ marginLeft:'auto' }}>⚙️ Meal Rates</button>
        {tab === 'daily' && (
          <button className="btn btn-primary" onClick={saveAll} disabled={saving}>
            {saving ? 'Saving…' : '💾 Save Attendance'}
          </button>
        )}
      </div>

      {/* Daily Stats Bar */}
      {tab === 'daily' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:12, marginBottom:20 }}>
          {[
            { label:'Residents', value: totalRes, color:'var(--accent)' },
            { label:`🌅 Breakfast (₹${settings.breakfast_rate}/head)`, value: bCount, color:'#f59e0b' },
            { label:`☀️ Lunch (₹${settings.lunch_rate}/head)`,         value: lCount, color:'#22c55e' },
            { label:`🌙 Dinner (₹${settings.dinner_rate}/head)`,       value: dCount, color:'#6366f1' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding:'14px 18px', textAlign:'center' }}>
              <div style={{ fontSize:10, color:'var(--text-3)', textTransform:'uppercase', marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:24, fontWeight:900, color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {loading ? <div className="spinner-wrap"><div className="spinner" /></div> : tab === 'daily' ? (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--bg-hover)' }}>
                <th style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase' }}>Room</th>
                <th style={{ padding:'10px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase' }}>Resident</th>
                {['breakfast','lunch','dinner'].map(m => (
                  <th key={m} style={{ padding:'10px 16px', textAlign:'center', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase' }}>
                    <div>{MEAL_CFG[m].icon} {MEAL_CFG[m].label}</div>
                    <div style={{ display:'flex', gap:4, justifyContent:'center', marginTop:4 }}>
                      <button onClick={() => markAll(m, true)}  style={{ fontSize:9, padding:'1px 6px', borderRadius:4, border:'1px solid #22c55e40', background:'#22c55e18', color:'#22c55e', cursor:'pointer' }}>All ✓</button>
                      <button onClick={() => markAll(m, false)} style={{ fontSize:9, padding:'1px 6px', borderRadius:4, border:'1px solid #ef444440', background:'#ef444418', color:'#ef4444', cursor:'pointer' }}>None ✗</button>
                    </div>
                  </th>
                ))}
                <th style={{ padding:'10px 16px', textAlign:'right', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase' }}>Day Cost</th>
              </tr>
            </thead>
            <tbody>
              {(daily.residents || []).map(r => {
                const ed = edits[r.resident_id] || { breakfast: true, lunch: true, dinner: true };
                const cost = (ed.breakfast ? settings.breakfast_rate : 0) + (ed.lunch ? settings.lunch_rate : 0) + (ed.dinner ? settings.dinner_rate : 0);
                return (
                  <tr key={r.resident_id} style={{ borderTop:'1px solid var(--border)' }}>
                    <td style={{ padding:'10px 16px', fontWeight:700 }}>Room {r.room_number}</td>
                    <td style={{ padding:'10px 16px', fontWeight:600 }}>{r.resident_name}</td>
                    {['breakfast','lunch','dinner'].map(meal => (
                      <td key={meal} style={{ padding:'10px 16px', textAlign:'center' }}>
                        <button onClick={() => toggle(r.resident_id, meal)} style={{
                          width:36, height:36, borderRadius:8, cursor:'pointer', fontSize:16,
                          border: `2px solid ${ed[meal] ? MEAL_CFG[meal].color : 'var(--border)'}`,
                          background: ed[meal] ? `${MEAL_CFG[meal].color}18` : 'var(--bg-hover)',
                          transition: 'all 0.15s',
                        }}>
                          {ed[meal] ? '✓' : '✗'}
                        </button>
                      </td>
                    ))}
                    <td style={{ padding:'10px 16px', textAlign:'right', fontWeight:700, color: cost > 0 ? 'var(--accent)' : 'var(--text-3)' }}>
                      ₹{cost}
                    </td>
                  </tr>
                );
              })}
              {(daily.residents || []).length === 0 && (
                <tr><td colSpan={6} style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>No active residents</td></tr>
              )}
            </tbody>
            {(daily.residents || []).length > 0 && (
              <tfoot>
                <tr style={{ background:'var(--bg-hover)', borderTop:'2px solid var(--border)' }}>
                  <td colSpan={5} style={{ padding:'12px 16px', fontWeight:800, fontSize:14 }}>Total Meal Cost for {date}</td>
                  <td style={{ padding:'12px 16px', textAlign:'right', fontWeight:900, fontSize:16, color:'var(--accent)' }}>₹{dailyCost.toLocaleString()}</td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      ) : (
        /* Monthly Summary */
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:14, marginBottom:20 }}>
            {[
              { label:'Days in Month', value: monthly.days_in_month, color:'var(--accent)' },
              { label:'Active Residents', value: (monthly.residents||[]).length, color:'#3b82f6' },
              { label:'Total Mess Revenue', value: `₹${totalMealCost.toLocaleString()}`, color:'#22c55e' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding:'18px 22px', textAlign:'center' }}>
                <div style={{ fontSize:10, color:'var(--text-3)', textTransform:'uppercase', marginBottom:6 }}>{s.label}</div>
                <div style={{ fontSize:26, fontWeight:900, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--bg-hover)' }}>
                  {['Room','Resident','Days Marked','🌅 Breakfast','☀️ Lunch','🌙 Dinner','Meal Cost (₹)'].map(h => (
                    <th key={h} style={{ padding:'11px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {(monthly.residents || []).map((r, i) => (
                  <tr key={i} style={{ borderTop:'1px solid var(--border)' }}>
                    <td style={{ padding:'10px 14px', fontWeight:700 }}>Room {r.room_number}</td>
                    <td style={{ padding:'10px 14px', fontWeight:600 }}>{r.resident_name}</td>
                    <td style={{ padding:'10px 14px', color:'var(--text-2)' }}>{r.days_marked || 0} / {monthly.days_in_month}</td>
                    <td style={{ padding:'10px 14px', color:'#f59e0b', fontWeight:700 }}>{r.breakfast_days || 0}</td>
                    <td style={{ padding:'10px 14px', color:'#22c55e', fontWeight:700 }}>{r.lunch_days || 0}</td>
                    <td style={{ padding:'10px 14px', color:'#6366f1', fontWeight:700 }}>{r.dinner_days || 0}</td>
                    <td style={{ padding:'10px 14px', fontWeight:800, color:'var(--accent)' }}>₹{(r.meal_cost || 0).toLocaleString()}</td>
                  </tr>
                ))}
                {(monthly.residents || []).length === 0 && (
                  <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>No data for this month</td></tr>
                )}
              </tbody>
              {(monthly.residents || []).length > 0 && (
                <tfoot>
                  <tr style={{ background:'var(--bg-hover)', borderTop:'2px solid var(--border)' }}>
                    <td colSpan={6} style={{ padding:'12px 14px', fontWeight:800, fontSize:14 }}>Total Mess Revenue — {MONTHS[month-1]} {year}</td>
                    <td style={{ padding:'12px 14px', fontWeight:900, fontSize:16, color:'#22c55e' }}>₹{totalMealCost.toLocaleString()}</td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        </div>
      )}

      {/* Meal Rate Settings Modal */}
      {showRate && (
        <div className="modal-overlay" onClick={() => setShowRate(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:380 }}>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:6 }}>Meal Rate Settings</div>
            <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:20 }}>Set the charge per resident per meal. This affects monthly cost calculations.</div>
            {[
              { key:'breakfast_rate', label:'🌅 Breakfast Rate (₹/head/day)' },
              { key:'lunch_rate',     label:'☀️ Lunch Rate (₹/head/day)' },
              { key:'dinner_rate',    label:'🌙 Dinner Rate (₹/head/day)' },
            ].map(f => (
              <div className="form-group" key={f.key}>
                <label className="form-label">{f.label}</label>
                <input type="number" value={settings[f.key]} min={0}
                  onChange={e => setSettings(s => ({ ...s, [f.key]: Number(e.target.value) }))}
                  className="form-input" />
              </div>
            ))}
            <div style={{ padding:'12px 16px', background:'var(--bg-hover)', borderRadius:8, fontSize:13, marginBottom:16 }}>
              Full-day rate: <strong>₹{(settings.breakfast_rate + settings.lunch_rate + settings.dinner_rate).toLocaleString()}</strong> per resident/day
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShowRate(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveSettings}>Save Rates</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
