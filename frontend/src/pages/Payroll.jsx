import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

export default function Payroll() {
  const [month,   setMonth]   = useState(new Date().getMonth() + 1);
  const [year,    setYear]    = useState(new Date().getFullYear());
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [gen,     setGen]     = useState(false);
  const [edit,    setEdit]    = useState(null);
  const [eForm,   setEForm]   = useState({});
  const [err,     setErr]     = useState('');

  const load = async () => {
    setLoading(true);
    const rows = await api.getPayroll(month, year).catch(() => []);
    setRecords(Array.isArray(rows) ? rows : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, [month, year]);

  const generate = async () => {
    setGen(true);
    await api.generatePayroll({ month, year }).catch(e => setErr(e.message));
    setGen(false); load();
  };

  const openEdit = r => { setEdit(r); setEForm({ advances: r.advances||0, deductions: r.deductions||0, bonus: r.bonus||0, notes: r.notes||'' }); };

  const saveEdit = async () => {
    await api.updatePayrollItem(edit.id, eForm).catch(e => setErr(e.message));
    setEdit(null); load();
  };

  const markPaid = async r => {
    const today = new Date().toISOString().split('T')[0];
    await api.updatePayrollItem(r.id, { status:'paid', paid_date: today }).catch(e => setErr(e.message));
    load();
  };

  const total_salary = records.reduce((a,r) => a + (r.net_salary||0), 0);
  const paid_count   = records.filter(r => r.status === 'paid').length;

  return (
    <div>
      {/* Controls */}
      <div style={{ display:'flex', gap:12, alignItems:'center', marginBottom:24, flexWrap:'wrap' }}>
        <select value={month} onChange={e => setMonth(Number(e.target.value))} className="form-input" style={{ width:120 }}>
          {MONTHS.map((m,i) => <option key={m} value={i+1}>{m}</option>)}
        </select>
        <input type="number" value={year} onChange={e => setYear(Number(e.target.value))} className="form-input" style={{ width:90 }} />
        <button className="btn btn-primary" onClick={generate} disabled={gen}>
          {gen ? 'Generating…' : '⚙️ Generate Payroll'}
        </button>
        {err && <span style={{ color:'var(--danger)', fontSize:13 }}>{err}</span>}
        <div style={{ marginLeft:'auto', display:'flex', gap:20 }}>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:'var(--text-3)' }}>Total Payable</div>
            <div style={{ fontSize:20, fontWeight:900, color:'var(--accent)' }}>₹{total_salary.toLocaleString()}</div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:'var(--text-3)' }}>Paid / Total</div>
            <div style={{ fontSize:20, fontWeight:900, color:'#22c55e' }}>{paid_count}/{records.length}</div>
          </div>
        </div>
      </div>

      {loading ? <div className="spinner-wrap"><div className="spinner" /></div> : (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--bg-hover)' }}>
                {['Staff','Role','Base Salary','Days Present','Advances','Deductions','Bonus','Net Salary','Status','Actions'].map(h => (
                  <th key={h} style={{ padding:'12px 14px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase', whiteSpace:'nowrap' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {records.map(r => (
                <tr key={r.id} style={{ borderTop:'1px solid var(--border)' }}>
                  <td style={{ padding:'12px 14px', fontWeight:600 }}>{r.staff_name}</td>
                  <td style={{ padding:'12px 14px', color:'var(--text-2)', fontSize:13 }}>{r.staff_role}</td>
                  <td style={{ padding:'12px 14px' }}>₹{(r.base_salary||0).toLocaleString()}</td>
                  <td style={{ padding:'12px 14px', textAlign:'center' }}>{r.present_days||0}/{r.working_days||0}</td>
                  <td style={{ padding:'12px 14px', color:'#ef4444' }}>-₹{(r.advances||0).toLocaleString()}</td>
                  <td style={{ padding:'12px 14px', color:'#ef4444' }}>-₹{(r.deductions||0).toLocaleString()}</td>
                  <td style={{ padding:'12px 14px', color:'#22c55e' }}>+₹{(r.bonus||0).toLocaleString()}</td>
                  <td style={{ padding:'12px 14px', fontWeight:800, color:'var(--accent)' }}>₹{(r.net_salary||0).toLocaleString()}</td>
                  <td style={{ padding:'12px 14px' }}>
                    <span style={{
                      padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700,
                      background: r.status==='paid' ? '#22c55e18' : '#f59e0b18',
                      color:      r.status==='paid' ? '#22c55e'   : '#f59e0b'
                    }}>{r.status==='paid' ? 'Paid' : 'Pending'}</span>
                  </td>
                  <td style={{ padding:'12px 14px' }}>
                    <div style={{ display:'flex', gap:6 }}>
                      <button className="btn btn-ghost btn-sm" onClick={() => openEdit(r)}>Edit</button>
                      {r.status !== 'paid' && (
                        <button className="btn btn-sm" style={{ background:'#22c55e18', color:'#22c55e', border:'1px solid #22c55e30' }} onClick={() => markPaid(r)}>Pay</button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {records.length === 0 && (
                <tr><td colSpan={10} style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>
                  No payroll for this month. Click "Generate Payroll" to calculate from attendance.
                </td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit Modal */}
      {edit && (
        <div className="modal-overlay" onClick={() => setEdit(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:440 }}>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Adjust Payroll — {edit.staff_name}</div>
            <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:20 }}>Base: ₹{(edit.base_salary||0).toLocaleString()} | Present: {edit.present_days||0}/{edit.working_days||0} days</div>
            {[
              { name:'advances',   label:'Advances Taken (₹)',  note:'Deducted from salary' },
              { name:'deductions', label:'Other Deductions (₹)', note:'PF, ESI, fines etc.' },
              { name:'bonus',      label:'Bonus / Incentive (₹)', note:'Performance / festival bonus' },
            ].map(f => (
              <div key={f.name} className="form-group">
                <label className="form-label">{f.label}</label>
                <input type="number" value={eForm[f.name]} onChange={e => setEForm(x => ({...x,[f.name]:Number(e.target.value)}))} className="form-input" min={0} />
                <div style={{ fontSize:11, color:'var(--text-3)', marginTop:3 }}>{f.note}</div>
              </div>
            ))}
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input value={eForm.notes} onChange={e => setEForm(x => ({...x,notes:e.target.value}))} className="form-input" />
            </div>
            <div style={{ background:'var(--bg-hover)', borderRadius:10, padding:'12px 16px', marginBottom:20, fontSize:14 }}>
              Net Salary = ₹{Math.max(0, Math.round((edit.base_salary||0) * ((edit.present_days||0)/(edit.working_days||1)) + Number(eForm.bonus) - Number(eForm.advances) - Number(eForm.deductions))).toLocaleString()}
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setEdit(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={saveEdit}>Save Changes</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
