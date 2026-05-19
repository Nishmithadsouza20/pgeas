import React, { useEffect, useRef, useState } from 'react';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const PROPERTY_TYPES = [
  { value:'pg',        label:'PG (Paying Guest)',   icon:'🏠' },
  { value:'lodge',     label:'Lodge',               icon:'🛏️' },
  { value:'dormitory', label:'Dormitory',            icon:'🏫' },
  { value:'hostel',    label:'Hostel',              icon:'🏨' },
  { value:'apartment', label:'Apartment / Flat',    icon:'🏢' },
];

const ACCENT_PRESETS = [
  '#FF6B35','#3b82f6','#22c55e','#8b5cf6','#ec4899','#f59e0b','#06b6d4','#ef4444'
];

function isImageLogo(v) {
  return v && (v.startsWith('data:') || v.startsWith('http'));
}

function LogoDisplay({ value, size = 64, style = {} }) {
  if (isImageLogo(value)) {
    return <img src={value} alt="logo" style={{ width:size, height:size, objectFit:'cover', borderRadius:14, ...style }} />;
  }
  return <span style={{ fontSize: size * 0.5, lineHeight:1 }}>{value || '🏠'}</span>;
}

const PLAN_COLOR = { basic:'#3b82f6', premium:'#FF6B35', enterprise:'#8b5cf6' };
const PLAN_AMT   = { basic:2999, premium:4999, enterprise:7999 };

const PLAN_FEATURES = {
  basic: {
    label: 'Basic', price: '₹2,999',
    features: [
      'Up to 50 rooms',
      'Resident management',
      'Rent collection & payments',
      'Complaints & notices',
      'Visitors log',
      'Maintenance requests',
      'Gate pass management',
      'Mess menu',
      'Enquiries tracking',
    ],
    locked: [
      'Full analytics & reports',
      'Invoice generation',
      'Staff & payroll',
      'Security deposits',
      'Expense tracking',
      'Meal attendance',
    ],
  },
  premium: {
    label: 'Premium', price: '₹4,999',
    features: [
      'Up to 200 rooms',
      'Everything in Basic',
      'Full analytics & revenue charts',
      'Invoice generation',
      'Staff management & attendance',
      'Payroll generation',
      'Security deposits & refunds',
      'Expense tracking',
      'Meal attendance tracking',
      'Occupancy & P&L reports',
    ],
    locked: [
      'Unlimited rooms',
      'Priority support',
      'Advanced rent roll reports',
      'Custom branding (domain)',
    ],
  },
  enterprise: {
    label: 'Enterprise', price: '₹7,999',
    features: [
      'Unlimited rooms',
      'Everything in Premium',
      'Priority support (4-hour SLA)',
      'Advanced rent roll & defaulters',
      'Food inventory management',
      'Dedicated account manager',
      'Custom branding',
      'Data export (CSV)',
      'Multi-floor management',
    ],
    locked: [],
  },
};

function PlanSection({ company }) {
  const plan      = company.plan || 'basic';
  const info      = PLAN_FEATURES[plan] || PLAN_FEATURES.basic;
  const planColor = PLAN_COLOR[plan] || 'var(--accent)';
  const amt       = company.subscription_amount || PLAN_AMT[plan] || 2999;

  const nextPlan  = plan === 'basic' ? 'premium' : plan === 'premium' ? 'enterprise' : null;
  const nextInfo  = nextPlan ? PLAN_FEATURES[nextPlan] : null;
  const nextColor = nextPlan ? PLAN_COLOR[nextPlan] : null;

  return (
    <div className="card" style={{ padding:24, marginBottom:20 }}>
      <div style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:18, display:'flex', alignItems:'center', gap:8 }}>
        💳 My Subscription Plan
      </div>

      {/* Current plan header */}
      <div style={{
        padding:'16px 20px', borderRadius:12, marginBottom:20,
        background:`linear-gradient(135deg,${planColor}18,${planColor}08)`,
        border:`1.5px solid ${planColor}40`,
        display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:12,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:14 }}>
          <div style={{
            width:44, height:44, borderRadius:12,
            background: planColor, display:'flex', alignItems:'center', justifyContent:'center',
            fontSize:20, flexShrink:0,
            boxShadow:`0 4px 14px ${planColor}50`,
          }}>
            {plan === 'basic' ? '🔵' : plan === 'premium' ? '🟠' : '🟣'}
          </div>
          <div>
            <div style={{ fontSize:18, fontWeight:900, color: planColor }}>
              {info.label} Plan
            </div>
            <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
              Active since {company.registered_at?.slice(0,10) || '—'}
            </div>
          </div>
        </div>
        <div style={{ textAlign:'right' }}>
          <div style={{ fontSize:26, fontWeight:900, color: planColor }}>{info.price}<span style={{ fontSize:13, fontWeight:600, color:'var(--text-3)' }}>/mo</span></div>
          <div style={{
            fontSize:11, fontWeight:700, marginTop:4, padding:'2px 10px', borderRadius:20,
            background: company.status === 'active' ? 'rgba(34,197,94,0.12)' : 'rgba(245,158,11,0.12)',
            color: company.status === 'active' ? 'var(--success)' : 'var(--warning)',
            display:'inline-block',
          }}>
            {company.status?.toUpperCase() || 'ACTIVE'}
          </div>
        </div>
      </div>

      {/* Stats row */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12, marginBottom:20 }}>
        {[
          { label:'Total Rooms',  value: company.total_rooms || 0,          color:'var(--accent)' },
          { label:'Monthly Fee',  value: `₹${amt.toLocaleString()}`,         color: planColor },
          { label:'Account',      value: (company.status || 'active').toUpperCase(), color: company.status === 'active' ? 'var(--success)' : 'var(--warning)' },
        ].map(s => (
          <div key={s.label} style={{ padding:'12px 14px', background:'var(--bg-hover)', borderRadius:10, textAlign:'center' }}>
            <div style={{ fontSize:10, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:0.5, marginBottom:5 }}>{s.label}</div>
            <div style={{ fontSize:17, fontWeight:800, color:s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* Features grid — current plan */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom: nextInfo ? 20 : 0 }}>
        <div style={{ padding:'14px 16px', background:'var(--bg-hover)', borderRadius:10 }}>
          <div style={{ fontSize:12, fontWeight:700, color:'var(--text-1)', marginBottom:12 }}>
            Included in your plan
          </div>
          {info.features.map(f => (
            <div key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, fontSize:12 }}>
              <span style={{ color:'var(--success)', fontWeight:700, flexShrink:0 }}>✓</span>
              <span style={{ color:'var(--text-2)' }}>{f}</span>
            </div>
          ))}
        </div>

        <div style={{ padding:'14px 16px', background:'var(--bg-hover)', borderRadius:10 }}>
          {info.locked.length > 0 ? (
            <>
              <div style={{ fontSize:12, fontWeight:700, color:'var(--text-3)', marginBottom:12 }}>
                Not available on {info.label}
              </div>
              {info.locked.map(f => (
                <div key={f} style={{ display:'flex', alignItems:'center', gap:8, marginBottom:8, fontSize:12 }}>
                  <span style={{ color:'var(--text-3)', flexShrink:0 }}>✕</span>
                  <span style={{ color:'var(--text-3)' }}>{f}</span>
                </div>
              ))}
            </>
          ) : (
            <div style={{ display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', height:'100%', textAlign:'center', padding:'20px 0' }}>
              <div style={{ fontSize:28, marginBottom:8 }}>🏆</div>
              <div style={{ fontSize:13, fontWeight:700, color:'var(--success)' }}>You're on the top plan!</div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>All features unlocked.</div>
            </div>
          )}
        </div>
      </div>

      {/* Upgrade nudge */}
      {nextInfo && (
        <div style={{
          padding:'14px 18px', borderRadius:10,
          background:`${nextColor}0a`, border:`1px solid ${nextColor}30`,
          display:'flex', alignItems:'center', justifyContent:'space-between', flexWrap:'wrap', gap:10,
        }}>
          <div>
            <div style={{ fontSize:12, fontWeight:700, color: nextColor, marginBottom:4 }}>
              Upgrade to {nextInfo.label} — {nextInfo.price}/mo
            </div>
            <div style={{ fontSize:11, color:'var(--text-3)' }}>
              Unlock: {nextInfo.features.slice(1, 4).join(' · ')} and more
            </div>
          </div>
          <div style={{ fontSize:11, color:'var(--text-3)', fontStyle:'italic' }}>
            Contact support to upgrade
          </div>
        </div>
      )}
    </div>
  );
}

export default function Settings() {
  const { refreshCompany } = useAuth();
  const logoRef = useRef(null);
  const [company, setCompany]  = useState(null);
  const [form,    setForm]     = useState({});
  const [loading, setLoading]  = useState(true);
  const [saving,  setSaving]   = useState(false);
  const [saved,   setSaved]    = useState(false);
  const [error,   setError]    = useState('');

  useEffect(() => {
    api.getMySettings()
      .then(c => { setCompany(c); setForm({
        company_name:   c.company_name   || '',
        pg_logo:        c.pg_logo        || '🏠',
        accent_color:   c.accent_color   || '#FF6B35',
        pg_tagline:     c.pg_tagline     || '',
        contact_email:  c.contact_email  || '',
        contact_phone:  c.contact_phone  || '',
        address:        c.address        || '',
        city:           c.city           || '',
        property_type:  c.property_type  || 'pg',
      }); })
      .catch(() => setError('Could not load settings.'))
      .finally(() => setLoading(false));
  }, []);

  const handle = e => setForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const handleLogoFile = e => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 200 * 1024) { alert('Image must be under 200 KB. Please resize it first.'); return; }
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, pg_logo: ev.target.result }));
    reader.readAsDataURL(file);
  };

  const save = async e => {
    e.preventDefault(); setSaving(true); setError(''); setSaved(false);
    try {
      await api.updateMySettings(form);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
      await refreshCompany();
    } catch (err) { setError(err.message); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="spinner-wrap"><div className="spinner" /><span>Loading…</span></div>;

  return (
    <div style={{ maxWidth:780, margin:'0 auto' }}>
      {/* Preview banner */}
      <div style={{
        borderRadius:16, padding:'28px 32px', marginBottom:28,
        background:`linear-gradient(135deg, ${form.accent_color}22 0%, ${form.accent_color}08 100%)`,
        border:`1px solid ${form.accent_color}40`,
      }}>
        <div style={{ display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
          <div style={{
            width:64, height:64, borderRadius:16,
            background:`${form.accent_color}20`, border:`2px solid ${form.accent_color}50`,
            display:'flex', alignItems:'center', justifyContent:'center', flexShrink:0, overflow:'hidden'
          }}>
            <LogoDisplay value={form.pg_logo} size={64} />
          </div>
          <div>
            <div style={{ fontSize:22, fontWeight:800, color:'var(--text-1)' }}>
              {form.company_name || 'Your Property Name'}
            </div>
            {form.pg_tagline && (
              <div style={{ fontSize:13, color:'var(--text-2)', marginTop:4 }}>{form.pg_tagline}</div>
            )}
            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:6, display:'flex', gap:16 }}>
              {form.city && <span>📍 {form.city}</span>}
              {form.contact_phone && <span>📞 {form.contact_phone}</span>}
              {form.contact_email && <span>✉️ {form.contact_email}</span>}
            </div>
          </div>
          <div style={{ marginLeft:'auto', textAlign:'right' }}>
            <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:6, textTransform:'uppercase', letterSpacing:0.5 }}>Live Preview</div>
            <div style={{
              padding:'6px 16px', borderRadius:20, fontSize:12, fontWeight:700,
              background: form.accent_color, color:'#fff'
            }}>PGease</div>
          </div>
        </div>
      </div>

      <form onSubmit={save}>
        {/* Branding */}
        <div className="card" style={{ padding:24, marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
            🎨 Branding
          </div>

          {/* Property type selector */}
          <div className="form-group" style={{ marginBottom:20 }}>
            <label className="form-label">Property Type</label>
            <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginTop:8 }}>
              {PROPERTY_TYPES.map(pt => (
                <div key={pt.value} onClick={() => setForm(f => ({ ...f, property_type: pt.value }))}
                  style={{
                    padding:'10px 8px', borderRadius:10, cursor:'pointer', textAlign:'center',
                    border:`1.5px solid`,
                    borderColor: form.property_type === pt.value ? 'var(--accent)' : 'var(--border)',
                    background: form.property_type === pt.value ? 'var(--accent)15' : 'var(--bg-hover)',
                    transition:'all 0.15s',
                  }}>
                  <div style={{ fontSize:20, marginBottom:4 }}>{pt.icon}</div>
                  <div style={{ fontSize:10, fontWeight:700, color: form.property_type === pt.value ? 'var(--accent)' : 'var(--text-2)' }}>
                    {pt.label}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div className="form-group">
              <label className="form-label">Property Name</label>
              <input name="company_name" value={form.company_name} onChange={handle} className="form-input" placeholder="Sunrise Homes" />
            </div>
            <div className="form-group">
              <label className="form-label">Logo</label>
              <div style={{ display:'flex', gap:12, alignItems:'center', marginTop:6, flexWrap:'wrap' }}>
                <div style={{
                  width:56, height:56, borderRadius:12, overflow:'hidden', flexShrink:0,
                  background:'var(--bg-hover)', border:'1px solid var(--border)',
                  display:'flex', alignItems:'center', justifyContent:'center',
                }}>
                  <LogoDisplay value={form.pg_logo} size={56} />
                </div>
                <div style={{ flex:1 }}>
                  <div style={{ display:'flex', gap:8, marginBottom:8 }}>
                    <button type="button" className="btn btn-ghost btn-sm"
                      onClick={() => logoRef.current?.click()}>
                      Upload Image
                    </button>
                    {isImageLogo(form.pg_logo) && (
                      <button type="button" className="btn btn-danger btn-sm"
                        onClick={() => setForm(f => ({ ...f, pg_logo:'🏠' }))}>
                        Remove
                      </button>
                    )}
                  </div>
                  {!isImageLogo(form.pg_logo) && (
                    <input name="pg_logo" value={form.pg_logo} onChange={handle}
                      className="form-input" placeholder="🏠" style={{ fontSize:20, width:80 }} maxLength={4} />
                  )}
                  <div style={{ fontSize:11, color:'var(--text-3)', marginTop:4 }}>
                    Upload a PNG/JPG (max 200 KB) or type an emoji
                  </div>
                </div>
              </div>
              <input ref={logoRef} type="file" accept="image/*"
                style={{ display:'none' }} onChange={handleLogoFile} />
            </div>
            <div className="form-group" style={{ gridColumn:'1/-1' }}>
              <label className="form-label">Tagline</label>
              <input name="pg_tagline" value={form.pg_tagline} onChange={handle} className="form-input"
                placeholder="Your home away from home…" />
            </div>
          </div>

          {/* Accent color picker */}
          <div className="form-group" style={{ marginTop:4 }}>
            <label className="form-label">Brand Accent Color</label>
            <div style={{ display:'flex', gap:10, alignItems:'center', flexWrap:'wrap', marginTop:8 }}>
              {ACCENT_PRESETS.map(c => (
                <div key={c} onClick={() => setForm(f => ({ ...f, accent_color: c }))}
                  style={{
                    width:32, height:32, borderRadius:8, background:c, cursor:'pointer',
                    border: form.accent_color === c ? '3px solid var(--text-1)' : '2px solid transparent',
                    boxShadow: form.accent_color === c ? `0 0 0 2px ${c}60` : 'none',
                    transition:'all 0.15s', flexShrink:0
                  }} />
              ))}
              <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                <input type="color" value={form.accent_color}
                  onChange={e => setForm(f => ({ ...f, accent_color: e.target.value }))}
                  style={{ width:32, height:32, border:'none', borderRadius:8, cursor:'pointer', padding:0, background:'none' }} />
                <span style={{ fontSize:12, color:'var(--text-3)', fontFamily:'monospace' }}>{form.accent_color}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Contact */}
        <div className="card" style={{ padding:24, marginBottom:20 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text-1)', marginBottom:20, display:'flex', alignItems:'center', gap:8 }}>
            📞 Contact Information
          </div>
          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
            <div className="form-group">
              <label className="form-label">Contact Email</label>
              <input name="contact_email" type="email" value={form.contact_email} onChange={handle} className="form-input" placeholder="info@mypg.com" />
            </div>
            <div className="form-group">
              <label className="form-label">Contact Phone</label>
              <input name="contact_phone" value={form.contact_phone} onChange={handle} className="form-input" placeholder="9800000000" />
            </div>
            <div className="form-group">
              <label className="form-label">City</label>
              <input name="city" value={form.city} onChange={handle} className="form-input" placeholder="Bangalore" />
            </div>
            <div className="form-group">
              <label className="form-label">Full Address</label>
              <input name="address" value={form.address} onChange={handle} className="form-input" placeholder="123 MG Road, Bangalore 560001" />
            </div>
          </div>
        </div>

        {/* Plan & Subscription */}
        {company && <PlanSection company={company} />}

        {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}

        <div style={{ display:'flex', gap:12, justifyContent:'flex-end' }}>
          {saved && (
            <div style={{ display:'flex', alignItems:'center', gap:6, fontSize:13, color:'var(--success)', fontWeight:600 }}>
              ✅ Settings saved!
            </div>
          )}
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? 'Saving…' : 'Save Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
