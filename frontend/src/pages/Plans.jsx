import React, { useEffect, useState } from 'react';
import { api } from '../utils/api';

const PLANS = [
  {
    key: 'basic',
    label: 'Basic',
    price: 2999,
    color: '#3b82f6',
    bg: 'rgba(59,130,246,0.08)',
    border: 'rgba(59,130,246,0.3)',
    icon: '🏠',
    tagline: 'Perfect for small PGs & lodges',
    features: [
      { text: 'Up to 50 rooms', included: true },
      { text: 'Resident portal access', included: true },
      { text: 'Payments & invoicing', included: true },
      { text: 'Complaints management', included: true },
      { text: 'Visitor log', included: true },
      { text: 'Basic reports', included: true },
      { text: 'Notice board', included: true },
      { text: 'Mess menu management', included: false },
      { text: 'Gate pass management', included: false },
      { text: 'Advanced analytics', included: false },
      { text: 'Staff & payroll', included: false },
      { text: 'Custom branding', included: false },
    ],
  },
  {
    key: 'premium',
    label: 'Premium',
    price: 4999,
    color: '#FF6B35',
    bg: 'rgba(255,107,53,0.08)',
    border: 'rgba(255,107,53,0.3)',
    icon: '⭐',
    tagline: 'For growing hostels & PG chains',
    popular: true,
    features: [
      { text: 'Up to 200 rooms', included: true },
      { text: 'Resident portal access', included: true },
      { text: 'Payments & invoicing', included: true },
      { text: 'Complaints management', included: true },
      { text: 'Visitor log', included: true },
      { text: 'Advanced reports & exports', included: true },
      { text: 'Notice board', included: true },
      { text: 'Mess menu management', included: true },
      { text: 'Gate pass management', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'Staff & payroll', included: true },
      { text: 'Custom branding', included: false },
    ],
  },
  {
    key: 'enterprise',
    label: 'Enterprise',
    price: 7999,
    color: '#8b5cf6',
    bg: 'rgba(139,92,246,0.08)',
    border: 'rgba(139,92,246,0.3)',
    icon: '💎',
    tagline: 'For large operations & apartments',
    features: [
      { text: 'Unlimited rooms', included: true },
      { text: 'Resident portal access', included: true },
      { text: 'Payments & invoicing', included: true },
      { text: 'Complaints management', included: true },
      { text: 'Visitor log', included: true },
      { text: 'Advanced reports & exports', included: true },
      { text: 'Notice board', included: true },
      { text: 'Mess menu management', included: true },
      { text: 'Gate pass management', included: true },
      { text: 'Advanced analytics', included: true },
      { text: 'Staff & payroll', included: true },
      { text: 'Custom branding', included: true },
    ],
  },
];

export default function Plans() {
  const [companies, setCompanies] = useState([]);
  const [loading,   setLoading]   = useState(true);

  useEffect(() => {
    api.get('/companies/')
      .then(setCompanies)
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const countFor  = key => companies.filter(c => c.plan === key).length;
  const activeFor = key => companies.filter(c => c.plan === key && c.status === 'active').length;
  const revenueFor= key => {
    const p = PLANS.find(pl => pl.key === key);
    return activeFor(key) * (p?.price || 0);
  };
  const totalMRR = PLANS.reduce((s, p) => s + revenueFor(p.key), 0);

  return (
    <div>
      {/* ── Plan Cards ── */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:20, marginBottom:32 }}>
        {PLANS.map(plan => (
          <div key={plan.key} className="card" style={{
            padding:0, overflow:'hidden', position:'relative',
            border: plan.popular ? `2px solid ${plan.color}` : '1px solid var(--border)',
            boxShadow: plan.popular ? `0 4px 24px ${plan.bg}` : undefined,
          }}>
            {plan.popular && (
              <div style={{
                position:'absolute', top:14, right:14,
                background: plan.color, color:'#fff',
                fontSize:10, fontWeight:700, letterSpacing:0.8,
                padding:'3px 9px', borderRadius:20, textTransform:'uppercase',
              }}>Most Popular</div>
            )}

            {/* Card header */}
            <div style={{
              padding:'22px 22px 18px',
              background: plan.bg,
              borderBottom:`1px solid ${plan.border}`,
            }}>
              <div style={{ display:'flex', alignItems:'center', gap:10, marginBottom:10 }}>
                <div style={{
                  width:40, height:40, borderRadius:10, fontSize:20,
                  display:'flex', alignItems:'center', justifyContent:'center',
                  background:`${plan.color}22`, border:`1px solid ${plan.border}`,
                }}>{plan.icon}</div>
                <div>
                  <div style={{ fontWeight:800, fontSize:16, color:'var(--text-1)' }}>{plan.label}</div>
                  <div style={{ fontSize:11, color:'var(--text-3)' }}>{plan.tagline}</div>
                </div>
              </div>
              <div style={{ display:'flex', alignItems:'baseline', gap:4 }}>
                <span style={{ fontSize:30, fontWeight:800, color:plan.color }}>
                  ₹{plan.price.toLocaleString()}
                </span>
                <span style={{ fontSize:12, color:'var(--text-3)' }}>/month</span>
              </div>
            </div>

            {/* Live stats */}
            {!loading && (
              <div style={{
                display:'grid', gridTemplateColumns:'1fr 1fr 1fr',
                padding:'12px 22px', gap:0,
                borderBottom:'1px solid var(--border)',
                background:'var(--bg-hover)',
              }}>
                {[
                  { label:'Total',   value: countFor(plan.key)  },
                  { label:'Active',  value: activeFor(plan.key) },
                  { label:'MRR',     value: `₹${(revenueFor(plan.key)/1000).toFixed(1)}k` },
                ].map(s => (
                  <div key={s.label} style={{ textAlign:'center' }}>
                    <div style={{ fontSize:16, fontWeight:800, color: s.label === 'MRR' ? plan.color : 'var(--text-1)' }}>
                      {s.value}
                    </div>
                    <div style={{ fontSize:10, color:'var(--text-3)', marginTop:1 }}>{s.label}</div>
                  </div>
                ))}
              </div>
            )}

            {/* Features list */}
            <div style={{ padding:'16px 22px 20px' }}>
              <div style={{ fontSize:10, fontWeight:700, letterSpacing:1, textTransform:'uppercase', color:'var(--text-3)', marginBottom:12 }}>
                Features
              </div>
              {plan.features.map((f, i) => (
                <div key={i} style={{
                  display:'flex', alignItems:'center', gap:9,
                  padding:'5px 0', fontSize:13,
                  color: f.included ? 'var(--text-1)' : 'var(--text-3)',
                }}>
                  <span style={{
                    width:16, height:16, borderRadius:'50%', flexShrink:0, fontSize:10,
                    display:'flex', alignItems:'center', justifyContent:'center',
                    background: f.included ? `${plan.color}20` : 'var(--bg-hover)',
                    color: f.included ? plan.color : 'var(--text-3)',
                  }}>
                    {f.included ? '✓' : '✕'}
                  </span>
                  {f.text}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* ── Plan Comparison Summary ── */}
      <div style={{ fontSize:10, fontWeight:700, letterSpacing:1.2, textTransform:'uppercase', color:'var(--text-3)', marginBottom:12, paddingLeft:2 }}>
        Subscriber Breakdown
      </div>
      <div className="card" style={{ padding:0, overflow:'hidden', marginBottom:24 }}>
        <table style={{ width:'100%', borderCollapse:'collapse', fontSize:13 }}>
          <thead>
            <tr style={{ background:'var(--bg-hover)' }}>
              {['Plan','Price/mo','Total Clients','Active','Trial','Inactive','MRR Contribution','% of MRR'].map(h => (
                <th key={h} style={{ padding:'10px 16px', textAlign:'left', fontWeight:600, fontSize:11, color:'var(--text-3)', borderBottom:'1px solid var(--border)', whiteSpace:'nowrap' }}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {PLANS.map((plan, idx) => {
              const total    = countFor(plan.key);
              const active   = activeFor(plan.key);
              const trial    = companies.filter(c => c.plan === plan.key && c.status === 'trial').length;
              const inactive = companies.filter(c => c.plan === plan.key && c.status === 'inactive').length;
              const rev      = revenueFor(plan.key);
              const pct      = totalMRR ? Math.round(rev / totalMRR * 100) : 0;
              return (
                <tr key={plan.key} style={{ borderBottom: idx < PLANS.length - 1 ? '1px solid var(--border)' : 'none' }}>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{
                        width:8, height:8, borderRadius:'50%', background:plan.color, flexShrink:0,
                      }} />
                      <span style={{ fontWeight:700, color:plan.color }}>{plan.label}</span>
                    </div>
                  </td>
                  <td style={{ padding:'12px 16px', color:'var(--text-2)', fontWeight:600 }}>
                    ₹{plan.price.toLocaleString()}
                  </td>
                  <td style={{ padding:'12px 16px', fontWeight:700, color:'var(--text-1)' }}>{total}</td>
                  <td style={{ padding:'12px 16px', fontWeight:700, color:'var(--success)' }}>{active}</td>
                  <td style={{ padding:'12px 16px', fontWeight:700, color:'var(--warning)' }}>{trial}</td>
                  <td style={{ padding:'12px 16px', fontWeight:700, color:'var(--danger)' }}>{inactive}</td>
                  <td style={{ padding:'12px 16px', fontWeight:700, color:plan.color }}>
                    ₹{rev.toLocaleString()}
                  </td>
                  <td style={{ padding:'12px 16px' }}>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div style={{ flex:1, height:6, background:'var(--bg-hover)', borderRadius:3, overflow:'hidden', minWidth:60 }}>
                        <div style={{ height:'100%', width:`${pct}%`, background:plan.color, borderRadius:3 }} />
                      </div>
                      <span style={{ fontSize:12, fontWeight:700, color:plan.color, minWidth:32 }}>{pct}%</span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr style={{ background:'var(--bg-hover)', borderTop:'2px solid var(--border)' }}>
              <td colSpan={2} style={{ padding:'10px 16px', fontWeight:700, fontSize:13, color:'var(--text-1)' }}>Total</td>
              <td style={{ padding:'10px 16px', fontWeight:800, color:'var(--text-1)' }}>{companies.length}</td>
              <td style={{ padding:'10px 16px', fontWeight:800, color:'var(--success)' }}>{companies.filter(c=>c.status==='active').length}</td>
              <td style={{ padding:'10px 16px', fontWeight:800, color:'var(--warning)' }}>{companies.filter(c=>c.status==='trial').length}</td>
              <td style={{ padding:'10px 16px', fontWeight:800, color:'var(--danger)' }}>{companies.filter(c=>c.status==='inactive').length}</td>
              <td style={{ padding:'10px 16px', fontWeight:800, color:'var(--accent)' }}>₹{totalMRR.toLocaleString()}</td>
              <td style={{ padding:'10px 16px', fontWeight:800, color:'var(--text-1)' }}>100%</td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
