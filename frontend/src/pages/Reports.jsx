import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Reports() {
  const [tab,    setTab]    = useState('pl');
  const [month,  setMonth]  = useState(new Date().getMonth() + 1);
  const [year,   setYear]   = useState(new Date().getFullYear());
  const [pl,     setPl]     = useState(null);
  const [roll,   setRoll]   = useState([]);
  const [def,    setDef]    = useState([]);
  const [occ,    setOcc]    = useState(null);
  const [loading,setLoading]= useState(false);

  const load = async () => {
    setLoading(true);
    try {
      if (tab === 'pl')         { const d = await api.getPlReport(month, year);  setPl(d); }
      else if (tab === 'roll')  { const d = await api.getRentRoll(month, year);  setRoll(Array.isArray(d) ? d : []); }
      else if (tab === 'def')   { const d = await api.getDefaulters();            setDef(Array.isArray(d) ? d : []); }
      else if (tab === 'occ')   { const d = await api.getOccupancyReport();       setOcc(d); }
    } catch(e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [tab, month, year]);

  const printPage = () => window.print();

  return (
    <div>
      {/* Tabs */}
      <div style={{ display:'flex', gap:10, marginBottom:24, alignItems:'center', flexWrap:'wrap' }}>
        <div style={{ display:'flex', gap:0, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden' }}>
          {[['pl','P&L Report'],['roll','Rent Roll'],['def','Defaulters'],['occ','Occupancy']].map(([v,l]) => (
            <button key={v} onClick={() => setTab(v)} className={`btn btn-sm ${tab===v?'btn-primary':'btn-ghost'}`}
              style={{ borderRadius:0, padding:'8px 16px' }}>{l}</button>
          ))}
        </div>
        {(tab === 'pl' || tab === 'roll') && (
          <>
            <select value={month} onChange={e => setMonth(Number(e.target.value))} className="form-input" style={{ width:120 }}>
              {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
            </select>
            <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="form-input" style={{ width:90 }} />
          </>
        )}
        <button className="btn btn-ghost btn-sm" onClick={printPage} style={{ marginLeft:'auto' }}>🖨 Print</button>
      </div>

      {loading && <div className="spinner-wrap"><div className="spinner" /></div>}

      {/* P&L Report */}
      {!loading && tab === 'pl' && pl && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20 }}>
            {[
              { label:'Total Income',   value:`₹${(pl.total_income||0).toLocaleString()}`,   color:'#22c55e' },
              { label:'Total Expenses', value:`₹${(pl.total_expenses||0).toLocaleString()}`, color:'#ef4444' },
              { label:'Net Profit',     value:`₹${(pl.net_profit||0).toLocaleString()}`,     color: pl.net_profit >= 0 ? '#22c55e' : '#ef4444' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding:'22px 24px', textAlign:'center' }}>
                <div style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>{s.label}</div>
                <div style={{ fontSize:28, fontWeight:900, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div className="card" style={{ padding:20 }}>
              <div style={{ fontWeight:700, marginBottom:16, fontSize:14 }}>Income Breakdown</div>
              {[
                { label:'Rent Collected', value: pl.rent_income||0 },
                { label:'Utility Charges', value: pl.utility_income||0 },
              ].map(r => (
                <div key={r.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                  <span style={{ color:'var(--text-2)' }}>{r.label}</span>
                  <span style={{ fontWeight:700, color:'#22c55e' }}>₹{r.value.toLocaleString()}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0 0', fontSize:14, fontWeight:800 }}>
                <span>Total Income</span>
                <span style={{ color:'#22c55e' }}>₹{(pl.total_income||0).toLocaleString()}</span>
              </div>
            </div>
            <div className="card" style={{ padding:20 }}>
              <div style={{ fontWeight:700, marginBottom:16, fontSize:14 }}>Expense Breakdown</div>
              {(pl.expenses_breakdown||[]).map(e => (
                <div key={e.category} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                  <span style={{ color:'var(--text-2)', textTransform:'capitalize' }}>{e.category}</span>
                  <span style={{ fontWeight:700, color:'#ef4444' }}>₹{(e.total||0).toLocaleString()}</span>
                </div>
              ))}
              <div style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
                <span style={{ color:'var(--text-2)' }}>Payroll</span>
                <span style={{ fontWeight:700, color:'#ef4444' }}>₹{(pl.payroll_cost||0).toLocaleString()}</span>
              </div>
              <div style={{ display:'flex', justifyContent:'space-between', padding:'12px 0 0', fontSize:14, fontWeight:800 }}>
                <span>Total Expenses</span>
                <span style={{ color:'#ef4444' }}>₹{(pl.total_expenses||0).toLocaleString()}</span>
              </div>
            </div>
          </div>
          {pl.pending_count > 0 && (
            <div className="card" style={{ padding:16, marginTop:16, background:'#f59e0b10', border:'1px solid #f59e0b30' }}>
              <span style={{ color:'#f59e0b', fontWeight:700 }}>⚠️ {pl.pending_count} pending payment(s) worth ₹{(pl.pending_amount||0).toLocaleString()} not included in income.</span>
            </div>
          )}
        </div>
      )}

      {/* Rent Roll */}
      {!loading && tab === 'roll' && (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--bg-hover)' }}>
                {['Room','Resident','Phone','Rent (₹)','Utility (₹)','Penalty (₹)','Total (₹)','Payment Status'].map(h => (
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {roll.map((r, i) => (
                <tr key={i} style={{ borderTop:'1px solid var(--border)' }}>
                  <td style={{ padding:'10px 14px', fontWeight:700 }}>Room {r.room_number}</td>
                  <td style={{ padding:'10px 14px' }}>{r.name}</td>
                  <td style={{ padding:'10px 14px', fontSize:12, color:'var(--text-2)' }}>{r.phone||'—'}</td>
                  <td style={{ padding:'10px 14px' }}>₹{(r.rent_amount||0).toLocaleString()}</td>
                  <td style={{ padding:'10px 14px' }}>₹{(r.utility_amount||0).toLocaleString()}</td>
                  <td style={{ padding:'10px 14px', color:'#f59e0b' }}>₹{(r.penalty||0).toLocaleString()}</td>
                  <td style={{ padding:'10px 14px', fontWeight:800 }}>₹{((r.amount||0)+(r.utility_amount||0)+(r.penalty||0)).toLocaleString()}</td>
                  <td style={{ padding:'10px 14px' }}>
                    <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                      background: r.payment_status==='paid' ? '#22c55e18' : '#f59e0b18',
                      color:      r.payment_status==='paid' ? '#22c55e'   : '#f59e0b'
                    }}>{r.payment_status || 'no record'}</span>
                  </td>
                </tr>
              ))}
              {roll.length === 0 && <tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>No data for selected month</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Defaulters */}
      {!loading && tab === 'def' && (
        <div>
          {def.length > 0 && (
            <div className="card" style={{ padding:16, marginBottom:16, background:'#ef444410', border:'1px solid #ef444430' }}>
              <span style={{ color:'#ef4444', fontWeight:700 }}>🚨 {def.length} tenant(s) have overdue rent payments</span>
            </div>
          )}
          <div className="card" style={{ padding:0, overflow:'hidden' }}>
            <table style={{ width:'100%', borderCollapse:'collapse' }}>
              <thead>
                <tr style={{ background:'var(--bg-hover)' }}>
                  {['Resident','Phone','Room','Month/Year','Amount (₹)','Penalty (₹)','Days Overdue'].map(h => (
                    <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {def.map((r,i) => (
                  <tr key={i} style={{ borderTop:'1px solid var(--border)' }}>
                    <td style={{ padding:'12px 14px', fontWeight:600 }}>{r.name}</td>
                    <td style={{ padding:'12px 14px', fontSize:12, color:'var(--text-2)' }}>{r.phone||'—'}</td>
                    <td style={{ padding:'12px 14px' }}>Room {r.room_number}</td>
                    <td style={{ padding:'12px 14px', fontSize:13 }}>{MONTHS[(r.month||1)-1]} {r.year}</td>
                    <td style={{ padding:'12px 14px', fontWeight:700 }}>₹{(r.amount||0).toLocaleString()}</td>
                    <td style={{ padding:'12px 14px', color:'#f59e0b' }}>₹{(r.penalty||0).toLocaleString()}</td>
                    <td style={{ padding:'12px 14px' }}>
                      <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                        background: (r.days_overdue||0) > 30 ? '#ef444418' : '#f59e0b18',
                        color:      (r.days_overdue||0) > 30 ? '#ef4444'   : '#f59e0b'
                      }}>{r.days_overdue||0} days</span>
                    </td>
                  </tr>
                ))}
                {def.length === 0 && <tr><td colSpan={7} style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>No defaulters — all payments are up to date!</td></tr>}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Occupancy */}
      {!loading && tab === 'occ' && occ && (
        <div>
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:20 }}>
            {[
              { label:'Total Rooms',  value: occ.total,       color:'var(--accent)' },
              { label:'Occupied',     value: occ.occupied,    color:'#22c55e' },
              { label:'Vacant',       value: occ.vacant,      color:'#f59e0b' },
              { label:'Occupancy %',  value: `${occ.rate||0}%`, color: occ.rate>=80 ? '#22c55e' : '#f59e0b' },
            ].map(s => (
              <div key={s.label} className="card" style={{ padding:'22px 24px', textAlign:'center' }}>
                <div style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>{s.label}</div>
                <div style={{ fontSize:28, fontWeight:900, color:s.color }}>{s.value}</div>
              </div>
            ))}
          </div>
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontWeight:700, marginBottom:16, fontSize:14 }}>Floor-wise Occupancy</div>
            {(occ.by_floor||[]).map(f => {
              const pct = f.total ? Math.round(f.occupied / f.total * 100) : 0;
              return (
                <div key={f.floor} style={{ marginBottom:16 }}>
                  <div style={{ display:'flex', justifyContent:'space-between', marginBottom:6, fontSize:13 }}>
                    <span style={{ fontWeight:600 }}>Floor {f.floor}</span>
                    <span style={{ color:'var(--text-3)' }}>{f.occupied}/{f.total} rooms · {pct}%</span>
                  </div>
                  <div style={{ height:8, background:'var(--bg-hover)', borderRadius:4, overflow:'hidden' }}>
                    <div style={{ width:`${pct}%`, height:'100%', background: pct>=80?'#22c55e':pct>=50?'#f59e0b':'#ef4444', borderRadius:4, transition:'width 0.5s' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
