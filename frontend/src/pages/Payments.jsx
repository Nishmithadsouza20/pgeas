import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import PayGateway from './PayGateway';

const MONTHS = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const STATUS_BADGE = { paid:'success', pending:'warning', overdue:'danger' };

export default function Payments() {
  const { user }  = useAuth();
  const toast     = useToast();
  const isAdmin   = ['super_admin','owner'].includes(user?.role);

  const now = new Date();
  const [month,     setMonth]     = useState(now.getMonth()+1);
  const [year,      setYear]      = useState(now.getFullYear());
  const [status,    setStatus]    = useState('');
  const [payments,  setPayments]  = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [residents, setResidents] = useState([]);
  const [modal,     setModal]     = useState(false);
  const [gwPayment, setGwPayment] = useState(null);
  const [form,      setForm]      = useState({ resident_id:'', month:now.getMonth()+1, year:now.getFullYear(), amount:'', status:'pending', penalty:0 });
  const [loading,   setLoading]   = useState(true);
  const [error,     setError]     = useState('');

  const load = () => {
    const q = new URLSearchParams({ month, year });
    if (status) q.set('status', status);
    const calls = [api.getPayments(q.toString())];
    if (isAdmin) calls.push(api.paymentSummary(month, year), api.getResidents());
    return Promise.all(calls)
      .then(([pay, sum, res]) => {
        setPayments(pay);
        if (sum) setSummary(sum);
        if (res) setResidents(res);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, [month, year, status]);

  const handle   = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const openNew  = () => { setForm({ resident_id:'', month, year, amount:'', status:'pending', penalty:0 }); setError(''); setModal(true); };

  const markPaid = async id => {
    try { await api.updatePayment(id, { status:'paid' }); load(); toast.success('Payment marked as paid'); } catch(err) { toast.error(err.message); }
  };

  const remind = async id => {
    try { await api.remindPayment(id); load(); toast.success('Reminder sent successfully'); } catch(err) { toast.error(err.message); }
  };

  const submit = async e => {
    e.preventDefault(); setError('');
    try {
      await api.createPayment({
        ...form,
        month:   Number(form.month),
        year:    Number(form.year),
        amount:  Number(form.amount),
        penalty: Number(form.penalty),
      });
      setModal(false); load();
    } catch(err) { setError(err.message); }
  };

  const curYear = new Date().getFullYear();
  const years = Array.from({ length: curYear - 2022 }, (_, i) => 2023 + i);

  return (
    <>
      {/* Summary KPIs (admin/owner only) */}
      {isAdmin && summary && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
          {[
            { label:'Total Records', value: summary.total_records,                           color:'var(--text-1)' },
            { label:'Collected',     value: `₹${(summary.collected||0).toLocaleString()}`,   color:'var(--success)' },
            { label:'Pending',       value: summary.pending,                                  color:'var(--warning)' },
            { label:'Overdue',       value: summary.overdue,                                  color:'var(--danger)' },
          ].map(s => (
            <div key={s.label} className="stat-card">
              <div className="stat-label">{s.label}</div>
              <div className="stat-value" style={{ color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* Filters + Add */}
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexWrap:'wrap', gap:10 }}>
        <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
          <select value={month} onChange={e => setMonth(e.target.value)} className="form-input" style={{ width:'auto' }}>
            {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
          </select>
          <select value={year} onChange={e => setYear(e.target.value)} className="form-input" style={{ width:'auto' }}>
            {years.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
          <select value={status} onChange={e => setStatus(e.target.value)} className="form-input" style={{ width:'auto' }}>
            <option value="">All Status</option>
            {['paid','pending','overdue'].map(s => (
              <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
            ))}
          </select>
        </div>
        {isAdmin && (
          <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add Payment</button>
        )}
      </div>

      <div className="card" style={{ padding:0 }}>
        {loading ? (
          <div className="spinner-wrap"><div className="spinner" /><span>Loading…</span></div>
        ) : (
          <div className="table-wrap">
            <table className="pg-table">
              <thead>
                <tr>
                  <th>Resident</th><th>Room</th><th>Period</th>
                  <th>Amount</th><th>Penalty</th><th>Status</th><th>Paid On</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {payments.map(p => (
                  <tr key={p.id}>
                    <td style={{ fontWeight:600 }}>{p.resident_name}</td>
                    <td style={{ color:'var(--text-2)' }}>{p.room_number || '—'}</td>
                    <td style={{ color:'var(--text-2)', fontSize:13 }}>{MONTHS[p.month-1]} {p.year}</td>
                    <td style={{ fontWeight:700, color:'var(--accent)' }}>₹{p.amount?.toLocaleString()}</td>
                    <td>
                      {p.penalty > 0
                        ? <span style={{ color:'var(--danger)', fontWeight:600 }}>₹{p.penalty}</span>
                        : <span style={{ color:'var(--text-3)' }}>—</span>}
                    </td>
                    <td>
                      <span className={`badge badge-${STATUS_BADGE[p.status]||'info'}`} style={{ textTransform:'capitalize' }}>
                        {p.status}
                      </span>
                    </td>
                    <td style={{ color:'var(--text-3)', fontSize:12 }}>{p.paid_date || '—'}</td>
                    {/* Resident pay online button */}
                    {!isAdmin && (
                      <td>
                        {p.status !== 'paid' ? (
                          <button className="btn btn-primary btn-xs"
                            onClick={() => setGwPayment({ ...p, month_label:`${MONTHS[p.month-1]} ${p.year}` })}>
                            Pay Online
                          </button>
                        ) : (
                          <span style={{ fontSize:11, color:'var(--success)' }}>✓ Paid</span>
                        )}
                      </td>
                    )}
                    {isAdmin && (
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          {p.status !== 'paid' && (
                            <button className="btn btn-success btn-xs" onClick={() => markPaid(p.id)}>Mark Paid</button>
                          )}
                          {p.status !== 'paid' && !p.reminder_sent && (
                            <button className="btn btn-ghost btn-xs" onClick={() => remind(p.id)}>Remind</button>
                          )}
                          {p.reminder_sent && (
                            <span style={{ fontSize:11, color:'var(--text-3)' }}>Reminded</span>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))}
                {payments.length === 0 && (
                  <tr><td colSpan={8}>
                    <div className="empty-state">
                      <div className="empty-state-icon">💳</div>
                      <h4>No payment records</h4>
                      <p>No payments found for the selected month and filters.</p>
                      {isAdmin && <button className="btn btn-primary btn-sm" onClick={openNew}>+ Add Payment</button>}
                    </div>
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div style={{ marginTop:8, color:'var(--text-3)', fontSize:12 }}>
        {payments.length} record{payments.length !== 1 ? 's' : ''}
      </div>

      {/* Add Payment Modal */}
      {modal && (
        <div className="modal-overlay" onClick={() => setModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:480 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-1)' }}>Add Payment Record</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setModal(false)}>✕</button>
            </div>

            {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}

            <form onSubmit={submit}>
              <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">Resident</label>
                  <select name="resident_id" value={form.resident_id} onChange={handle} className="form-input" required>
                    <option value="">Select resident…</option>
                    {residents.map(r => (
                      <option key={r.id} value={r.id}>{r.name} — Room {r.room_number || '?'}</option>
                    ))}
                  </select>
                </div>

                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div className="form-group">
                    <label className="form-label">Month</label>
                    <select name="month" value={form.month} onChange={handle} className="form-input">
                      {MONTHS.map((m, i) => <option key={i+1} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Year</label>
                    <select name="year" value={form.year} onChange={handle} className="form-input">
                      {years.map(y => <option key={y} value={y}>{y}</option>)}
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Amount (₹)</label>
                    <input name="amount" type="number" value={form.amount} onChange={handle}
                      className="form-input" placeholder="7500" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Penalty (₹)</label>
                    <input name="penalty" type="number" value={form.penalty} onChange={handle}
                      className="form-input" placeholder="0" />
                  </div>
                </div>

                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select name="status" value={form.status} onChange={handle} className="form-input">
                    {['pending','paid','overdue'].map(s => (
                      <option key={s} value={s}>{s.charAt(0).toUpperCase()+s.slice(1)}</option>
                    ))}
                  </select>
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

      {/* Payment Gateway */}
      {gwPayment && (
        <PayGateway
          payment={gwPayment}
          onSuccess={() => { setGwPayment(null); load(); }}
          onClose={() => setGwPayment(null)}
        />
      )}
    </>
  );
}
