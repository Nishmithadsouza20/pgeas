import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const STATS = [
  { value:'2,400+', label:'Residents managed', color:'#FF6B35' },
  { value:'840+',   label:'Rooms tracked',      color:'#22c55e' },
  { value:'98%',    label:'Payment rate',        color:'#3b82f6' },
  { value:'4.9★',   label:'Owner satisfaction',  color:'#f59e0b' },
];

const FEATURES = [
  { icon:'💰', text:'Automated rent collection & reminders' },
  { icon:'📊', text:'Real-time occupancy & revenue analytics' },
  { icon:'🔧', text:'Maintenance request tracking' },
  { icon:'📱', text:'Mobile-ready resident portal' },
  { icon:'🍽️', text:'Mess menu & meal attendance' },
  { icon:'📋', text:'Complaints & notice management' },
];

export default function Login() {
  const [form,    setForm]    = useState({ email:'', password:'' });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);
  const { login } = useAuth();
  const navigate  = useNavigate();

  const submit = async e => {
    e.preventDefault();
    setError(''); setLoading(true);
    try { await login(form.email, form.password); navigate('/dashboard'); }
    catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  return (
    <div style={{
      display:'flex', minHeight:'100vh',
      background:'#060612', fontFamily:'Inter, system-ui, sans-serif',
    }}>
      {/* ── LEFT PANEL ── */}
      <div className="login-left" style={{
        flex:'0 0 52%', position:'relative', overflow:'hidden',
        background:'linear-gradient(135deg, #0a0a20 0%, #0d1635 40%, #0a1428 100%)',
        display:'flex', flexDirection:'column', padding:'48px 52px',
      }}>
        {/* Glow blobs */}
        <div style={{ position:'absolute', top:-120, left:-80, width:400, height:400, borderRadius:'50%', background:'rgba(255,107,53,0.07)', filter:'blur(80px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', bottom:-80, right:-60, width:320, height:320, borderRadius:'50%', background:'rgba(139,92,246,0.08)', filter:'blur(70px)', pointerEvents:'none' }} />
        <div style={{ position:'absolute', top:'40%', right:'10%', width:200, height:200, borderRadius:'50%', background:'rgba(34,197,94,0.05)', filter:'blur(60px)', pointerEvents:'none' }} />

        {/* Logo */}
        <div style={{ position:'relative', zIndex:1, marginBottom:52 }}>
          <div style={{ display:'flex', alignItems:'center', gap:12 }}>
            <div style={{
              width:46, height:46, borderRadius:14,
              background:'linear-gradient(135deg, #FF6B35, #ff9a6c)',
              display:'flex', alignItems:'center', justifyContent:'center',
              fontSize:22, boxShadow:'0 8px 24px rgba(255,107,53,0.4)',
            }}>🏠</div>
            <div>
              <div style={{ fontSize:22, fontWeight:900, color:'#fff', letterSpacing:'-0.5px' }}>PGease</div>
              <div style={{ fontSize:11, color:'#64748b', fontWeight:500, letterSpacing:2, textTransform:'uppercase', marginTop:1 }}>Property Platform</div>
            </div>
          </div>
        </div>

        {/* Headline */}
        <div style={{ position:'relative', zIndex:1, marginBottom:36 }}>
          <div style={{
            display:'inline-block', padding:'4px 12px', borderRadius:20,
            background:'rgba(255,107,53,0.12)', border:'1px solid rgba(255,107,53,0.25)',
            fontSize:11, color:'#FF6B35', fontWeight:700, letterSpacing:1.5,
            textTransform:'uppercase', marginBottom:16,
          }}>SaaS Accommodation Management</div>
          <h1 style={{
            fontSize:38, fontWeight:900, color:'#fff', lineHeight:1.15,
            letterSpacing:'-1px', margin:0,
          }}>
            The smarter way<br />
            <span style={{ background:'linear-gradient(90deg,#FF6B35,#ff9a6c)', WebkitBackgroundClip:'text', WebkitTextFillColor:'transparent' }}>
              to run your PG.
            </span>
          </h1>
          <p style={{ fontSize:14, color:'#64748b', marginTop:14, lineHeight:1.7, maxWidth:340 }}>
            One platform for rooms, residents, rent, complaints, staff, and everything in between.
          </p>
        </div>

        {/* Stats row */}
        <div style={{ position:'relative', zIndex:1, display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:32, maxWidth:360 }}>
          {STATS.map(s => (
            <div key={s.label} style={{
              padding:'14px 16px', borderRadius:12,
              background:'rgba(255,255,255,0.04)', border:'1px solid rgba(255,255,255,0.06)',
              backdropFilter:'blur(8px)',
            }}>
              <div style={{ fontSize:22, fontWeight:900, color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11, color:'#64748b', marginTop:2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Features list */}
        <div style={{ position:'relative', zIndex:1, display:'flex', flexDirection:'column', gap:10, maxWidth:340 }}>
          {FEATURES.map(f => (
            <div key={f.text} style={{ display:'flex', alignItems:'center', gap:10 }}>
              <div style={{
                width:28, height:28, borderRadius:8, flexShrink:0,
                background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.07)',
                display:'flex', alignItems:'center', justifyContent:'center', fontSize:13,
              }}>{f.icon}</div>
              <span style={{ fontSize:13, color:'#94a3b8' }}>{f.text}</span>
            </div>
          ))}
        </div>

        {/* Bottom credit */}
        <div style={{ position:'relative', zIndex:1, marginTop:'auto', paddingTop:32, fontSize:12, color:'#334155' }}>
          © 2025 PGease Software Pvt. Ltd.
        </div>
      </div>

      {/* ── RIGHT PANEL ── */}
      <div className="login-right" style={{
        flex:1, display:'flex', alignItems:'center', justifyContent:'center',
        padding:'40px 32px', background:'#0b0b1a',
      }}>
        <div style={{ width:'100%', maxWidth:420 }}>
          {/* Header */}
          <div style={{ marginBottom:28 }}>
            <h2 style={{ fontSize:26, fontWeight:800, color:'#f1f5f9', letterSpacing:'-0.5px', margin:0 }}>
              Welcome back
            </h2>
            <p style={{ color:'#64748b', fontSize:13, marginTop:6 }}>
              Sign in to your account to continue
            </p>
          </div>

          {/* Error */}
          {error && (
            <div style={{
              padding:'10px 14px', borderRadius:8, marginBottom:16,
              background:'rgba(239,68,68,0.1)', border:'1px solid rgba(239,68,68,0.25)',
              fontSize:13, color:'#f87171',
            }}>{error}</div>
          )}

          {/* Form */}
          <form onSubmit={submit}>
            <div style={{ marginBottom:16 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#94a3b8', display:'block', marginBottom:6 }}>
                Email Address
              </label>
              <input type="email" value={form.email}
                onChange={e => setForm(f=>({...f,email:e.target.value}))}
                placeholder="you@email.com" required
                style={{
                  width:'100%', padding:'11px 14px', borderRadius:10,
                  background:'rgba(255,255,255,0.05)', border:'1.5px solid rgba(255,255,255,0.1)',
                  color:'#f1f5f9', fontSize:14, outline:'none',
                  transition:'border-color 0.15s', boxSizing:'border-box',
                }}
                onFocus={e => e.target.style.borderColor = '#FF6B35'}
                onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
              />
            </div>
            <div style={{ marginBottom:24 }}>
              <label style={{ fontSize:12, fontWeight:600, color:'#94a3b8', display:'block', marginBottom:6 }}>
                Password
              </label>
              <div style={{ position:'relative' }}>
                <input type={showPw ? 'text' : 'password'} value={form.password}
                  onChange={e => setForm(f=>({...f,password:e.target.value}))}
                  placeholder="••••••••" required
                  style={{
                    width:'100%', padding:'11px 42px 11px 14px', borderRadius:10,
                    background:'rgba(255,255,255,0.05)', border:'1.5px solid rgba(255,255,255,0.1)',
                    color:'#f1f5f9', fontSize:14, outline:'none',
                    transition:'border-color 0.15s', boxSizing:'border-box',
                  }}
                  onFocus={e => e.target.style.borderColor = '#FF6B35'}
                  onBlur={e  => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button type="button" onClick={() => setShowPw(s=>!s)}
                  style={{
                    position:'absolute', right:12, top:'50%', transform:'translateY(-50%)',
                    background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#64748b', padding:4,
                  }}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
              <div style={{ textAlign:'right', marginTop:6 }}>
                <Link to="/forgot-password" style={{ fontSize:12, color:'#FF6B35', textDecoration:'none' }}>
                  Forgot password?
                </Link>
              </div>
            </div>

            <button type="submit" disabled={loading}
              style={{
                width:'100%', padding:'13px', borderRadius:11, border:'none',
                background: loading ? 'rgba(255,107,53,0.5)' : 'linear-gradient(135deg, #FF6B35, #ff9a6c)',
                color:'#fff', fontSize:15, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer',
                boxShadow: loading ? 'none' : '0 4px 20px rgba(255,107,53,0.35)',
                transition:'all 0.15s', letterSpacing:0.3,
              }}>
              {loading ? 'Signing in…' : 'Sign In →'}
            </button>
          </form>


          {/* Trust badges */}
          <div style={{ marginTop:32, display:'flex', justifyContent:'center', gap:20 }}>
            {['🔐 SSL Secured', '🛡️ Data Isolated', '⚡ 99.9% Uptime'].map(b => (
              <span key={b} style={{ fontSize:11, color:'#334155', fontWeight:600 }}>{b}</span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
