import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';

const STATUS_CFG = {
  present:  { label:'Present',  color:'#22c55e', bg:'#22c55e18' },
  absent:   { label:'Absent',   color:'#ef4444', bg:'#ef444418' },
  late:     { label:'Late',     color:'#f59e0b', bg:'#f59e0b18' },
  half_day: { label:'Half Day', color:'#3b82f6', bg:'#3b82f618' },
  holiday:  { label:'Holiday',  color:'#8b5cf6', bg:'#8b5cf618' },
};

const today = () => new Date().toISOString().split('T')[0];
const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Attendance() {
  const [tab,      setTab]      = useState('daily');
  const [date,     setDate]     = useState(today());
  const [month,    setMonth]    = useState(new Date().getMonth() + 1);
  const [year,     setYear]     = useState(new Date().getFullYear());
  const [staff,    setStaff]    = useState([]);
  const [summary,  setSummary]  = useState([]);
  const [marks,    setMarks]    = useState({});
  const [saving,   setSaving]   = useState(false);
  const [loading,  setLoading]  = useState(true);
  const [saved,    setSaved]    = useState(false);

  const loadDaily = async () => {
    setLoading(true);
    const rows = await api.getAttendance(`date=${date}`);
    setStaff(rows);
    const init = {};
    rows.forEach(r => { init[r.staff_id] = r.status || ''; });
    setMarks(init);
    setLoading(false);
  };

  const loadSummary = async () => {
    setLoading(true);
    const rows = await api.attendanceSummary(month, year);
    setSummary(rows);
    setLoading(false);
  };

  useEffect(() => { if (tab === 'daily') loadDaily(); else loadSummary(); }, [tab, date, month, year]);

  const setMark = (staff_id, status) => setMarks(m => ({ ...m, [staff_id]: status }));

  const save = async () => {
    setSaving(true);
    const records = Object.entries(marks)
      .filter(([, s]) => s)
      .map(([staff_id, status]) => ({ staff_id: Number(staff_id), date, status }));
    await api.markAttendance(records);
    setSaved(true); setTimeout(() => setSaved(false), 2500);
    setSaving(false);
  };

  const pct = (p, t) => t ? Math.round((p / t) * 100) : 0;

  return (
    <div>
      {/* Header */}
      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:24, flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:0, background:'var(--bg-card)', borderRadius:10, border:'1px solid var(--border)', overflow:'hidden' }}>
          {['daily','monthly'].map(t => (
            <button key={t} onClick={() => setTab(t)} className={`btn btn-sm ${tab===t ? 'btn-primary' : 'btn-ghost'}`}
              style={{ borderRadius:0, padding:'8px 18px' }}>
              {t === 'daily' ? 'Daily Attendance' : 'Monthly Summary'}
            </button>
          ))}
        </div>
        {tab === 'daily' ? (
          <input type="date" value={date} onChange={e => setDate(e.target.value)}
            className="form-input" style={{ width:'auto' }} />
        ) : (
          <div style={{ display:'flex', gap:8 }}>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="form-input" style={{ width:120 }}>
              {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))}
              className="form-input" style={{ width:90 }} />
          </div>
        )}
        {tab === 'daily' && (
          <button className="btn btn-primary" onClick={save} disabled={saving} style={{ marginLeft:'auto' }}>
            {saving ? 'Saving…' : saved ? '✅ Saved!' : 'Save Attendance'}
          </button>
        )}
      </div>

      {loading ? <div className="spinner-wrap"><div className="spinner" /></div> : tab === 'daily' ? (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--bg-hover)' }}>
                {['Staff Member','Role','Mark Status','Check In','Check Out'].map(h => (
                  <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:0.5 }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {staff.map(s => {
                const cur = marks[s.staff_id] || '';
                return (
                  <tr key={s.staff_id} style={{ borderTop:'1px solid var(--border)' }}>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                        <div className="avatar" style={{ width:34, height:34, fontSize:13 }}>{s.staff_name?.charAt(0)}</div>
                        <span style={{ fontWeight:600, color:'var(--text-1)' }}>{s.staff_name}</span>
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px', color:'var(--text-2)', fontSize:13 }}>{s.staff_role}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <div style={{ display:'flex', gap:6, flexWrap:'wrap' }}>
                        {Object.entries(STATUS_CFG).map(([k, v]) => (
                          <button key={k} onClick={() => setMark(s.staff_id, k)}
                            style={{
                              padding:'4px 10px', borderRadius:20, fontSize:11, fontWeight:700, cursor:'pointer',
                              border:`1.5px solid ${cur === k ? v.color : 'var(--border)'}`,
                              background: cur === k ? v.bg : 'transparent',
                              color: cur === k ? v.color : 'var(--text-3)',
                              transition:'all 0.12s'
                            }}>{v.label}</button>
                        ))}
                      </div>
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <input type="time" defaultValue={s.check_in || ''} className="form-input" style={{ width:110, padding:'4px 8px', fontSize:12 }} />
                    </td>
                    <td style={{ padding:'12px 16px' }}>
                      <input type="time" defaultValue={s.check_out || ''} className="form-input" style={{ width:110, padding:'4px 8px', fontSize:12 }} />
                    </td>
                  </tr>
                );
              })}
              {staff.length === 0 && (
                <tr><td colSpan={5} style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>No active staff found</td></tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:20 }}>
            {[
              { label:'Total Staff', value: summary.length, color:'var(--accent)' },
              { label:'Avg Present %', value: summary.length ? Math.round(summary.reduce((a,r) => a + pct(r.present_days, r.total_marked || 1), 0) / summary.length) + '%' : '—', color:'#22c55e' },
              { label:'Total Absences', value: summary.reduce((a,r) => a + (r.absent_days||0), 0), color:'#ef4444' },
              { label:'Half Days', value: summary.reduce((a,r) => a + (r.half_days||0), 0), color:'#3b82f6' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding:'18px 20px', textAlign:'center' }}>
                <div style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:6 }}>{s.label}</div>
                <div style={{ fontSize:26, fontWeight:900, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--bg-hover)' }}>
                  {['Staff Member','Role','Present','Absent','Late','Half Day','Attendance %'].map(h => (
                    <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {summary.map(r => {
                  const total = (r.present_days||0) + (r.absent_days||0) + (r.late||0) + (r.half_days||0);
                  const p = pct((r.present_days||0) + (r.late||0), total);
                  return (
                    <tr key={r.staff_id} style={{ borderTop:'1px solid var(--border)' }}>
                      <td style={{ padding:'12px 16px', fontWeight:600 }}>{r.name}</td>
                      <td style={{ padding:'12px 16px', color:'var(--text-2)', fontSize:13 }}>{r.staff_role}</td>
                      <td style={{ padding:'12px 16px', color:'#22c55e', fontWeight:700 }}>{r.present_days||0}</td>
                      <td style={{ padding:'12px 16px', color:'#ef4444', fontWeight:700 }}>{r.absent_days||0}</td>
                      <td style={{ padding:'12px 16px', color:'#f59e0b', fontWeight:700 }}>{r.late||0}</td>
                      <td style={{ padding:'12px 16px', color:'#3b82f6', fontWeight:700 }}>{r.half_days||0}</td>
                      <td style={{ padding:'12px 16px' }}>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{ flex:1, height:6, background:'var(--bg-hover)', borderRadius:3, overflow:'hidden' }}>
                            <div style={{ width:`${p}%`, height:'100%', background: p>=80 ? '#22c55e' : p>=60 ? '#f59e0b' : '#ef4444', borderRadius:3 }} />
                          </div>
                          <span style={{ fontSize:12, fontWeight:700, color: p>=80 ? '#22c55e' : p>=60 ? '#f59e0b' : '#ef4444', minWidth:36 }}>{p}%</span>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}
