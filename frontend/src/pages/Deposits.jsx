import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';

const STATUS_CFG = {
  held:      { color:'#22c55e', bg:'#22c55e18', label:'Held' },
  refunded:  { color:'#3b82f6', bg:'#3b82f618', label:'Refunded' },
  forfeited: { color:'#ef4444', bg:'#ef444418', label:'Forfeited' },
};

export default function Deposits() {
  const [data,     setData]     = useState({ deposits:[], total_held:0, total_refunded:0 });
  const [residents,setResidents]= useState([]);
  const [loading,  setLoading]  = useState(true);
  const [show,     setShow]     = useState(false);
  const [refund,   setRefund]   = useState(null);
  const [form,     setForm]     = useState({ resident_id:'', amount:'', paid_date:'', notes:'' });
  const [rForm,    setRForm]    = useState({ refund_amount:'', refund_date:'', notes:'' });
  const [err,      setErr]      = useState('');
  const today = new Date().toISOString().split('T')[0];

  const load = async () => {
    setLoading(true);
    const [d, r] = await Promise.all([api.getDeposits().catch(() => ({ deposits:[], total_held:0, total_refunded:0 })), api.getResidents().catch(() => [])]);
    setData(d);
    setResidents(Array.isArray(r) ? r : []);
    setLoading(false);
  };

  useEffect(() => { load(); }, []);

  const submit = async () => {
    if (!form.amount) { setErr('Amount is required'); return; }
    setErr('');
    const r = residents.find(x => x.id === Number(form.resident_id));
    await api.createDeposit({ ...form, amount: parseFloat(form.amount), resident_name: r?.name || '' }).catch(e => setErr(e.message));
    setShow(false); setForm({ resident_id:'', amount:'', paid_date:'', notes:'' }); load();
  };

  const processRefund = async () => {
    await api.updateDeposit(refund.id, { status:'refunded', refund_amount: parseFloat(rForm.refund_amount), refund_date: rForm.refund_date, notes: rForm.notes }).catch(e => setErr(e.message));
    setRefund(null); load();
  };

  return (
    <div>
      {/* Stats */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:20 }}>
        {[
          { label:'Total Held',        value:`₹${(data.total_held||0).toLocaleString()}`,     color:'#22c55e' },
          { label:'Total Refunded',    value:`₹${(data.total_refunded||0).toLocaleString()}`, color:'#3b82f6' },
          { label:'Active Deposits',   value: (data.deposits||[]).filter(d=>d.status==='held').length, color:'var(--accent)' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding:'20px 24px', textAlign:'center' }}>
            <div style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:8 }}>{s.label}</div>
            <div style={{ fontSize:28, fontWeight:900, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      <div style={{ display:'flex', justifyContent:'flex-end', marginBottom:16 }}>
        <button className="btn btn-primary" onClick={() => setShow(true)}>+ Add Deposit</button>
      </div>

      {loading ? <div className="spinner-wrap"><div className="spinner" /></div> : (
        <div className="card" style={{ padding:0, overflow:'hidden' }}>
          <table style={{ width:'100%', borderCollapse:'collapse' }}>
            <thead>
              <tr style={{ background:'var(--bg-hover)' }}>
                {['Resident','Room','Deposit Amount','Date Paid','Status','Refund Amount','Notes','Actions'].map(h => (
                  <th key={h} style={{ padding:'12px 16px', textAlign:'left', fontSize:11, fontWeight:700, color:'var(--text-3)', textTransform:'uppercase' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(data.deposits||[]).map(d => {
                const cfg = STATUS_CFG[d.status] || {};
                return (
                  <tr key={d.id} style={{ borderTop:'1px solid var(--border)' }}>
                    <td style={{ padding:'12px 16px', fontWeight:600 }}>{d.resident_name}</td>
                    <td style={{ padding:'12px 16px', color:'var(--text-2)', fontSize:13 }}>{d.room_number ? `Room ${d.room_number}` : '—'}</td>
                    <td style={{ padding:'12px 16px', fontWeight:700 }}>₹{(d.amount||0).toLocaleString()}</td>
                    <td style={{ padding:'12px 16px', fontSize:13, color:'var(--text-2)' }}>{d.paid_date || '—'}</td>
                    <td style={{ padding:'12px 16px' }}>
                      <span style={{ padding:'3px 10px', borderRadius:20, fontSize:11, fontWeight:700, background:cfg.bg, color:cfg.color }}>{cfg.label}</span>
                    </td>
                    <td style={{ padding:'12px 16px', color:'#3b82f6' }}>{d.refund_amount ? `₹${d.refund_amount.toLocaleString()}` : '—'}</td>
                    <td style={{ padding:'12px 16px', fontSize:12, color:'var(--text-3)', maxWidth:160, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{d.notes||'—'}</td>
                    <td style={{ padding:'12px 16px' }}>
                      {d.status === 'held' && (
                        <button className="btn btn-sm" style={{ background:'#3b82f618',color:'#3b82f6',border:'1px solid #3b82f630' }}
                          onClick={() => { setRefund(d); setRForm({ refund_amount: d.amount, refund_date: today, notes:'' }); }}>
                          Refund
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
              {(data.deposits||[]).length === 0 && (
                <tr><td colSpan={8} style={{ padding:40, textAlign:'center', color:'var(--text-3)' }}>No deposits recorded</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add Modal */}
      {show && (
        <div className="modal-overlay" onClick={() => setShow(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:420 }}>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:20 }}>Record Security Deposit</div>
            {err && <div className="alert alert-error" style={{ marginBottom:12 }}>{err}</div>}
            <div className="form-group">
              <label className="form-label">Resident</label>
              <select value={form.resident_id} onChange={e => setForm(f=>({...f,resident_id:e.target.value}))} className="form-input">
                <option value="">Select resident…</option>
                {residents.map(r => <option key={r.id} value={r.id}>{r.name} — Room {r.room_number}</option>)}
              </select>
            </div>
            <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
              <div className="form-group">
                <label className="form-label">Amount (₹) *</label>
                <input type="number" value={form.amount} onChange={e => setForm(f=>({...f,amount:e.target.value}))} className="form-input" min={0} />
              </div>
              <div className="form-group">
                <label className="form-label">Date Paid</label>
                <input type="date" value={form.paid_date||today} onChange={e => setForm(f=>({...f,paid_date:e.target.value}))} className="form-input" />
              </div>
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input value={form.notes} onChange={e => setForm(f=>({...f,notes:e.target.value}))} className="form-input" placeholder="Cheque no., mode of payment…" />
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setShow(false)}>Cancel</button>
              <button className="btn btn-primary" onClick={submit}>Save Deposit</button>
            </div>
          </div>
        </div>
      )}

      {/* Refund Modal */}
      {refund && (
        <div className="modal-overlay" onClick={() => setRefund(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:400 }}>
            <div style={{ fontSize:16, fontWeight:800, marginBottom:4 }}>Process Refund</div>
            <div style={{ fontSize:12, color:'var(--text-3)', marginBottom:20 }}>Deposit held: ₹{refund.amount?.toLocaleString()} — {refund.resident_name}</div>
            <div className="form-group">
              <label className="form-label">Refund Amount (₹)</label>
              <input type="number" value={rForm.refund_amount} onChange={e => setRForm(f=>({...f,refund_amount:e.target.value}))} className="form-input" max={refund.amount} min={0} />
            </div>
            <div className="form-group">
              <label className="form-label">Refund Date</label>
              <input type="date" value={rForm.refund_date} onChange={e => setRForm(f=>({...f,refund_date:e.target.value}))} className="form-input" />
            </div>
            <div className="form-group">
              <label className="form-label">Notes</label>
              <input value={rForm.notes} onChange={e => setRForm(f=>({...f,notes:e.target.value}))} className="form-input" placeholder="Deductions for damages, etc." />
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
              <button className="btn btn-ghost" onClick={() => setRefund(null)}>Cancel</button>
              <button className="btn btn-primary" onClick={processRefund}>Confirm Refund</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
