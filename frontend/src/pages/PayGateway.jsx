import React, { useState } from 'react';
import { api } from '../utils/api';

const METHODS = [
  { key:'upi',        label:'UPI',         icon:'📱', color:'#22c55e', desc:'PhonePe, GPay, Paytm, BHIM' },
  { key:'card',       label:'Debit/Credit', icon:'💳', color:'#3b82f6', desc:'Visa, Mastercard, RuPay' },
  { key:'netbanking', label:'Net Banking',  icon:'🏦', color:'#8b5cf6', desc:'All major Indian banks' },
];

const BANKS = ['State Bank of India','HDFC Bank','ICICI Bank','Axis Bank','Kotak Bank','Punjab National Bank','Bank of Baroda','Canara Bank','Union Bank','IndusInd Bank'];

export default function PayGateway({ payment, onSuccess, onClose }) {
  const [step,     setStep]     = useState('method');   // method → details → processing → success
  const [method,   setMethod]   = useState('upi');
  const [upiId,    setUpiId]    = useState('');
  const [cardNum,  setCardNum]  = useState('');
  const [cardExp,  setCardExp]  = useState('');
  const [cardCvv,  setCardCvv]  = useState('');
  const [cardName, setCardName] = useState('');
  const [bank,     setBank]     = useState('');
  const [error,    setError]    = useState('');
  const [txn,      setTxn]      = useState(null);

  const total = (payment.amount || 0) + (payment.penalty || 0);

  const formatCard = v => v.replace(/\D/g,'').slice(0,16).replace(/(.{4})/g,'$1 ').trim();
  const formatExp  = v => v.replace(/\D/g,'').slice(0,4).replace(/(.{2})/,'$1/').slice(0,5);

  const proceed = () => {
    setError('');
    if (method === 'upi'        && !upiId)   return setError('Enter your UPI ID');
    if (method === 'card'       && (!cardNum || cardNum.replace(/\s/g,'').length < 16)) return setError('Enter valid 16-digit card number');
    if (method === 'card'       && (!cardExp || !cardCvv || !cardName)) return setError('Fill in all card details');
    if (method === 'netbanking' && !bank)     return setError('Select your bank');
    setStep('processing');
    setTimeout(() => pay(), 2200); // simulate network delay
  };

  const pay = async () => {
    try {
      const payload = {
        payment_id:  payment.id,
        method,
        upi_id:      upiId,
        card_last4:  cardNum.replace(/\s/g,'').slice(-4),
        bank_name:   bank,
      };
      const res = await api.gatewayPay(payload);
      setTxn(res);
      setStep('success');
    } catch (err) {
      setError(err.message);
      setStep('details');
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div onClick={e => e.stopPropagation()}
        style={{
          background:'var(--bg-card)', border:'1px solid var(--border)',
          borderRadius:20, width:'100%', maxWidth:440,
          boxShadow:'0 20px 60px rgba(0,0,0,0.4)',
          animation:'slideUp 0.2s ease', overflow:'hidden'
        }}>

        {/* Header */}
        <div style={{
          background:'linear-gradient(135deg,#0B0B12,#1a1a2e)',
          padding:'20px 24px', display:'flex', justifyContent:'space-between', alignItems:'center'
        }}>
          <div style={{ display:'flex', alignItems:'center', gap:10 }}>
            <div style={{ width:32, height:32, background:'var(--accent)', borderRadius:8, display:'flex', alignItems:'center', justifyContent:'center', fontSize:16 }}>🏠</div>
            <div>
              <div style={{ fontSize:14, fontWeight:800, color:'#fff' }}>PGease Pay</div>
              <div style={{ fontSize:11, color:'#64748b' }}>Secure Payment Gateway</div>
            </div>
          </div>
          <button onClick={onClose} style={{ background:'transparent', border:'none', color:'#64748b', fontSize:20, cursor:'pointer' }}>✕</button>
        </div>

        {/* Amount banner */}
        <div style={{ padding:'16px 24px', background:'rgba(255,107,53,0.08)', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
          <div>
            <div style={{ fontSize:11, color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.8 }}>Amount Due</div>
            <div style={{ fontSize:28, fontWeight:900, color:'var(--accent)' }}>₹{total.toLocaleString()}</div>
            {payment.penalty > 0 && (
              <div style={{ fontSize:11, color:'var(--danger)' }}>Includes ₹{payment.penalty} late fee</div>
            )}
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:11, color:'var(--text-3)' }}>For</div>
            <div style={{ fontSize:13, fontWeight:600, color:'var(--text-1)' }}>Rent — {payment.month_label}</div>
          </div>
        </div>

        <div style={{ padding:24 }}>

          {/* ── STEP: Method selection ─────────────────── */}
          {step === 'method' && (
            <>
              <div style={{ fontSize:13, fontWeight:600, color:'var(--text-2)', marginBottom:14 }}>Choose payment method</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10, marginBottom:20 }}>
                {METHODS.map(m => (
                  <button key={m.key} onClick={() => setMethod(m.key)}
                    style={{
                      display:'flex', alignItems:'center', gap:14, padding:'14px 16px',
                      borderRadius:12, cursor:'pointer', border:'1.5px solid',
                      borderColor: method === m.key ? m.color : 'var(--border)',
                      background: method === m.key ? `${m.color}12` : 'var(--bg-input)',
                      transition:'all 0.15s', textAlign:'left',
                    }}>
                    <span style={{ fontSize:24 }}>{m.icon}</span>
                    <div style={{ flex:1 }}>
                      <div style={{ fontSize:14, fontWeight:700, color: method===m.key ? m.color : 'var(--text-1)' }}>{m.label}</div>
                      <div style={{ fontSize:11, color:'var(--text-3)' }}>{m.desc}</div>
                    </div>
                    <div style={{
                      width:18, height:18, borderRadius:'50%', border:`2px solid ${method===m.key ? m.color : 'var(--border)'}`,
                      background: method===m.key ? m.color : 'transparent', flexShrink:0,
                      display:'flex', alignItems:'center', justifyContent:'center'
                    }}>
                      {method===m.key && <div style={{ width:6, height:6, borderRadius:'50%', background:'#fff' }} />}
                    </div>
                  </button>
                ))}
              </div>
              <button className="btn btn-primary" onClick={() => setStep('details')}
                style={{ width:'100%', justifyContent:'center', padding:12, fontSize:14 }}>
                Continue →
              </button>
            </>
          )}

          {/* ── STEP: Details ──────────────────────────── */}
          {step === 'details' && (
            <>
              <button onClick={() => setStep('method')}
                style={{ background:'none', border:'none', color:'var(--text-3)', cursor:'pointer', fontSize:13, marginBottom:16, display:'flex', alignItems:'center', gap:4 }}>
                ← Back
              </button>

              {error && <div className="alert alert-error" style={{ marginBottom:14 }}>{error}</div>}

              {method === 'upi' && (
                <div>
                  <div style={{ textAlign:'center', fontSize:40, marginBottom:12 }}>📱</div>
                  <div style={{ textAlign:'center', fontSize:13, color:'var(--text-2)', marginBottom:20 }}>
                    Enter your UPI ID to pay ₹{total.toLocaleString()}
                  </div>
                  <div className="form-group">
                    <label className="form-label">UPI ID</label>
                    <input className="form-input" value={upiId} onChange={e => setUpiId(e.target.value)}
                      placeholder="yourname@paytm / 9876543210@ybl" style={{ textAlign:'center', fontSize:15 }} />
                  </div>
                  <div style={{ display:'flex', gap:10, marginTop:8, flexWrap:'wrap', justifyContent:'center' }}>
                    {['@paytm','@okaxis','@ybl','@upi'].map(s => (
                      <button key={s} onClick={() => setUpiId(upiId.split('@')[0]+s)}
                        style={{ padding:'3px 10px', borderRadius:12, border:'1px solid var(--border)', background:'transparent', color:'var(--text-2)', fontSize:11, cursor:'pointer' }}>
                        {s}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {method === 'card' && (
                <div style={{ display:'flex', flexDirection:'column', gap:14 }}>
                  <div style={{
                    background:'linear-gradient(135deg,#1a1a3e,#2a2a5e)', borderRadius:12,
                    padding:'16px 20px', marginBottom:4,
                    display:'flex', justifyContent:'space-between', alignItems:'center'
                  }}>
                    <div style={{ fontSize:16, color:'#aaa', letterSpacing:2, fontFamily:'monospace' }}>
                      {cardNum || '•••• •••• •••• ••••'}
                    </div>
                    <span style={{ fontSize:20 }}>💳</span>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Card Number</label>
                    <input className="form-input" value={cardNum} onChange={e => setCardNum(formatCard(e.target.value))}
                      placeholder="1234 5678 9012 3456" maxLength={19} style={{ fontFamily:'monospace', letterSpacing:1 }} />
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                    <div className="form-group">
                      <label className="form-label">Expiry (MM/YY)</label>
                      <input className="form-input" value={cardExp} onChange={e => setCardExp(formatExp(e.target.value))}
                        placeholder="12/28" maxLength={5} />
                    </div>
                    <div className="form-group">
                      <label className="form-label">CVV</label>
                      <input className="form-input" type="password" value={cardCvv}
                        onChange={e => setCardCvv(e.target.value.slice(0,3))} placeholder="•••" maxLength={3} />
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Cardholder Name</label>
                    <input className="form-input" value={cardName} onChange={e => setCardName(e.target.value)} placeholder="As on card" />
                  </div>
                </div>
              )}

              {method === 'netbanking' && (
                <div>
                  <div style={{ fontSize:13, color:'var(--text-2)', marginBottom:14 }}>Select your bank</div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, maxHeight:280, overflowY:'auto', marginBottom:4 }}>
                    {BANKS.map(b => (
                      <button key={b} onClick={() => setBank(b)}
                        style={{
                          padding:'10px 12px', borderRadius:10, cursor:'pointer', border:'1.5px solid',
                          borderColor: bank===b ? '#8b5cf6' : 'var(--border)',
                          background: bank===b ? 'rgba(139,92,246,0.12)' : 'var(--bg-input)',
                          color: bank===b ? '#8b5cf6' : 'var(--text-2)', fontSize:12, fontWeight: bank===b ? 700 : 500,
                          transition:'all 0.15s', textAlign:'left'
                        }}>
                        🏦 {b}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <button className="btn btn-primary" onClick={proceed}
                style={{ width:'100%', justifyContent:'center', padding:12, fontSize:14, marginTop:20 }}>
                Pay ₹{total.toLocaleString()} →
              </button>

              <div style={{ display:'flex', alignItems:'center', justifyContent:'center', gap:6, marginTop:14, fontSize:11, color:'var(--text-3)' }}>
                <span>🔒</span> 256-bit SSL Encrypted · Secured by PGease Pay
              </div>
            </>
          )}

          {/* ── STEP: Processing ───────────────────────── */}
          {step === 'processing' && (
            <div style={{ textAlign:'center', padding:'30px 0' }}>
              <div style={{ width:60, height:60, margin:'0 auto 20px', border:'4px solid var(--border)', borderTopColor:'var(--accent)', borderRadius:'50%', animation:'spin 0.8s linear infinite' }} />
              <div style={{ fontSize:16, fontWeight:700, color:'var(--text-1)', marginBottom:8 }}>Processing Payment…</div>
              <div style={{ fontSize:13, color:'var(--text-3)' }}>Please do not close this window</div>
              <div style={{ marginTop:16, fontSize:12, color:'var(--text-3)' }}>
                {method === 'upi' && `Sending ₹${total.toLocaleString()} request to ${upiId}`}
                {method === 'card' && `Charging card ending in ${cardNum.replace(/\s/g,'').slice(-4)}`}
                {method === 'netbanking' && `Redirecting to ${bank}…`}
              </div>
            </div>
          )}

          {/* ── STEP: Success ──────────────────────────── */}
          {step === 'success' && txn && (
            <div style={{ textAlign:'center', padding:'10px 0' }}>
              <div style={{ fontSize:56, marginBottom:12 }}>✅</div>
              <div style={{ fontSize:18, fontWeight:800, color:'var(--success)', marginBottom:6 }}>Payment Successful!</div>
              <div style={{ fontSize:13, color:'var(--text-2)', marginBottom:20 }}>
                ₹{total.toLocaleString()} paid successfully
              </div>
              <div style={{ background:'var(--bg-hover)', borderRadius:12, padding:'14px 18px', marginBottom:20, textAlign:'left' }}>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:12, color:'var(--text-3)' }}>Transaction ID</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--text-1)', fontFamily:'monospace' }}>{txn.transaction_ref}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between', marginBottom:8 }}>
                  <span style={{ fontSize:12, color:'var(--text-3)' }}>Amount Paid</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--success)' }}>₹{total.toLocaleString()}</span>
                </div>
                <div style={{ display:'flex', justifyContent:'space-between' }}>
                  <span style={{ fontSize:12, color:'var(--text-3)' }}>Payment Method</span>
                  <span style={{ fontSize:12, fontWeight:700, color:'var(--text-1)', textTransform:'capitalize' }}>{method}</span>
                </div>
              </div>
              <button className="btn btn-primary" onClick={onSuccess}
                style={{ width:'100%', justifyContent:'center', padding:12, fontSize:14 }}>
                Done
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
