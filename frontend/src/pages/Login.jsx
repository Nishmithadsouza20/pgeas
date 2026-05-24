import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STATS = [
  { value: '2,400+', label: 'Residents managed',  color: '#FF6B35' },
  { value: '840+',   label: 'Rooms tracked',       color: '#22c55e' },
  { value: '98%',    label: 'Payment success rate', color: '#3b82f6' },
  { value: '4.9★',   label: 'Owner satisfaction',  color: '#f59e0b' },
];

const FEATURES = [
  { icon: '💰', text: 'Automated rent collection & reminders' },
  { icon: '📊', text: 'Real-time occupancy & revenue analytics' },
  { icon: '🔧', text: 'Maintenance request tracking' },
  { icon: '📱', text: 'Mobile-ready resident portal' },
  { icon: '🍽️', text: 'Mess menu & meal attendance' },
  { icon: '📋', text: 'Complaints & notice management' },
];

export default function Login() {
  const [form,    setForm]    = useState({ email: '', password: '' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const submit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try {
      await login(form.email, form.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = focused => ({
    width: '100%', padding: '11px 14px', borderRadius: 10,
    background: 'rgba(255,255,255,0.05)',
    border: `1.5px solid ${focused ? '#FF6B35' : 'rgba(255,255,255,0.1)'}`,
    color: '#f1f5f9', fontSize: 14, outline: 'none',
    transition: 'border-color 0.15s', boxSizing: 'border-box',
    fontFamily: 'inherit',
  });

  return (
    <div style={{
      display: 'flex', minHeight: '100vh',
      background: '#060612', fontFamily: 'Inter, system-ui, sans-serif',
    }}>

      {/* ═══ LEFT PANEL — branding ═══ */}
      <div className="login-left" style={{
        flex: '0 0 52%', position: 'relative', overflow: 'hidden',
        background: 'linear-gradient(135deg, #0a0a20 0%, #0d1635 40%, #0a1428 100%)',
        display: 'flex', flexDirection: 'column', padding: '32px 48px',
      }}>
        {/* Ambient glow blobs */}
        <div style={{ position:'absolute', top:-120, left:-80, width:400, height:400, borderRadius:'50%', background:'rgba(255,107,53,0.07)', filter:'blur(80px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-80, right:-60, width:320, height:320, borderRadius:'50%', background:'rgba(139,92,246,0.08)', filter:'blur(70px)', pointerEvents:'none' }} />

        {/* Logo */}
        <div style={{ position:'relative', zIndex:1, marginBottom:28 }}>
          <div style={{ display:'flex', alignItems:'center', gap:14 }}>
            <div style={{
              width:44, height:44, borderRadius:12,
              background:'linear-gradient(135deg, #FF6B35, #ff9a6c)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:20, boxShadow:'0 8px 28px rgba(255,107,53,0.45)',
            }}>🏠</div>
            <div>
              <div style={{ fontSize:20, fontWeight:900, color:'#fff', letterSpacing:'-0.5px' }}>PGease</div>
              <div style={{ fontSize:10, color:'#64748b', fontWeight:600, letterSpacing:2.5, textTransform:'uppercase', marginTop:1 }}>Property Platform</div>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ position:'relative', zIndex:1, marginBottom:22 }}>
          <div style={{
            display:'inline-block', padding:'3px 10px', borderRadius:20,
            background:'rgba(255,107,53,0.12)', border:'1px solid rgba(255,107,53,0.25)',
            fontSize:9, color:'#FF6B35', fontWeight:700, letterSpacing:2,
            textTransform:'uppercase', marginBottom:12,
          }}>SaaS Accommodation Management</div>
          <h1 style={{
            fontSize:32, fontWeight:900, color:'#fff', lineHeight:1.15,
            letterSpacing:'-1px', margin:'0 0 10px',
          }}>
            The smarter way<br />
            <span style={{ background:'linear-gradient(90deg,#FF6B35,#ff9a6c)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              to run your PG.
            </span>
          </h1>
          <p style={{ fontSize:13, color:'#64748b', lineHeight:1.6, maxWidth:340 }}>
            One platform for rooms, residents, rent, complaints, staff, and everything in between.
          </p>
        </div>

        {/* Stats grid */}
        <div style={{ position:'relative', zIndex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:20, maxWidth:360 }}>
          {STATS.map(s => (
            <div key={s.label} style={{
              padding:'10px 14px', borderRadius:10,
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)',
              backdropFilter:'blur(8px)', transition:'border-color 0.2s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = `${s.color}40`}
            onMouseLeave={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)'}
            >
              <div style={{ fontSize:18, fontWeight:900, color:s.color, letterSpacing:'-0.5px' }}>{s.value}</div>
              <div style={{ fontSize:10, color:'#64748b', marginTop:1, fontWeight:500 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Feature list — 2 columns to save vertical space */}
        <div style={{ position:'relative', zIndex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:'7px 12px', maxWidth:380 }}>
          {FEATURES.map(f => (
            <div key={f.text} style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:12, flexShrink:0 }}>{f.icon}</span>
              <span style={{ fontSize:11, color:'#94a3b8', lineHeight:1.3 }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Footer credit — highlighted */}
        <div style={{ position:'relative', zIndex:1, marginTop:'auto', paddingTop:20 }}>
          <div style={{
            display:'inline-flex', alignItems:'center', gap:8,
            padding:'6px 14px', borderRadius:20,
            background:'rgba(255,107,53,0.12)', border:'1px solid rgba(255,107,53,0.3)',
          }}>
            <span style={{ fontSize:11, color:'#94a3b8' }}>College Project by</span>
            <span style={{ fontSize:12, fontWeight:800, color:'#FF6B35', letterSpacing:0.3 }}>Nishmitha Pawan</span>
          </div>
        </div>
      </div>

      {/* ═══ RIGHT PANEL — form ═══ */}
      <div className="login-right" style={{
        flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '40px 32px', background: '#0b0b1a',
      }}>
        <div style={{ width: '100%', maxWidth: 420 }}>

          {/* Mobile logo */}
          <div style={{ display:'none', alignItems:'center', gap:10, marginBottom:32, justifyContent:'center' }} className="login-mobile-logo">
            <div style={{ width:40, height:40, borderRadius:12, background:'linear-gradient(135deg,#FF6B35,#ff9a6c)', display:'flex', alignItems:'center', justifyContent:'center', fontSize:18 }}>🏠</div>
            <div style={{ fontSize:20, fontWeight:900, color:'#fff' }}>PGease</div>
          </div>

          {/* Header */}
          <div style={{ marginBottom:28 }}>
            <h2 style={{ fontSize:26, fontWeight:800, color:'#f1f5f9', letterSpacing:'-0.5px', margin:'0 0 6px' }}>
              Welcome back
            </h2>
            <p style={{ color:'#64748b', fontSize:13 }}>
              Sign in to your account to continue
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding:'11px 14px', borderRadius:10, marginBottom:16,
              background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)',
              fontSize:13, color:'#f87171', display:'flex', alignItems:'center', gap:8,
              animation:'fadeIn 0.2s ease',
            }}>
              <span>⚠</span> {error}
            </div>
          )}

          {/* Form */}
          <form onSubmit={submit}>
            {/* Email */}
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:11, fontWeight:700, color:'#94a3b8', display:'block', marginBottom:7, textTransform:'uppercase', letterSpacing:0.8 }}>
                Email Address
              </label>
              <input
                type="email" value={form.email}
                onChange={e => setForm(f => ({ ...f, email: e.target.value }))}
                placeholder="you@email.com" required
                style={inputStyle(false)}
                onFocus={e => e.target.style.borderColor = '#FF6B35'}
                onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>

            {/* Password */}
            <div style={{ marginBottom:24 }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:7 }}>
                <label style={{ fontSize:11, fontWeight:700, color:'#94a3b8', textTransform:'uppercase', letterSpacing:0.8 }}>
                  Password
                </label>
                <Link to="/forgot-password" style={{ fontSize:11, color:'#FF6B35', textDecoration:'none', fontWeight:600 }}>
                  Forgot password?
                </Link>
              </div>
              <div style={{ position:'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="••••••••" required
                  style={{ ...inputStyle(false), paddingRight:42 }}
                  onFocus={e => e.target.style.borderColor = '#FF6B35'}
                  onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button
                  type="button" onClick={() => setShowPw(s => !s)}
                  style={{
                    position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', fontSize:14,
                    color:'#64748b', padding:4, transition:'color 0.15s',
                  }}
                  onMouseEnter={e => e.target.style.color='#94a3b8'}
                  onMouseLeave={e => e.target.style.color='#64748b'}
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {/* Submit */}
            <button
              type="submit" disabled={loading}
              style={{
                width:'100%', padding:'13px', borderRadius:11, border:'none',
                background: loading ? 'rgba(255,107,53,0.45)' : 'linear-gradient(135deg, #FF6B35, #ff9a6c)',
                color:'#fff', fontSize:15, fontWeight:700,
                cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 22px rgba(255,107,53,0.38)',
                transition:'all 0.2s', letterSpacing:0.3,
                display:'flex', alignItems:'center', justifyContent:'center', gap:8,
              }}
              onMouseEnter={e => { if (!loading) e.target.style.transform='translateY(-1px)'; }}
              onMouseLeave={e => { e.target.style.transform='translateY(0)'; }}
            >
              {loading ? (
                <>
                  <span style={{ width:16, height:16, border:'2px solid rgba(255,255,255,0.3)', borderTopColor:'#fff', borderRadius:'50%', display:'inline-block', animation:'spin 0.7s linear infinite' }} />
                  Signing in…
                </>
              ) : 'Sign In →'}
            </button>
          </form>

          {/* Trust badges */}
          <div style={{ marginTop:28, display:'flex', justifyContent:'center', gap:20 }}>
            {['🔐 SSL Secured', '🛡️ Data Isolated', '⚡ 99.9% Uptime'].map(b => (
              <span key={b} style={{ fontSize:11, color:'#475569', fontWeight:600 }}>{b}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
