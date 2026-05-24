import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { api } from '../utils/api';

const STEP = { email: 'email', otp: 'otp', reset: 'reset', done: 'done' };

export default function ForgotPassword() {
  const navigate = useNavigate();
  const [step,     setStep]     = useState(STEP.email);
  const [email,    setEmail]    = useState('');
  const [otp,      setOtp]      = useState('');
  const [pw,       setPw]       = useState('');
  const [pw2,      setPw2]      = useState('');
  const [showPw,   setShowPw]   = useState(false);
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);

  const sendOtp = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await api.forgotPassword(email);
      setStep(STEP.otp);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const verifyOtp = async e => {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      await api.verifyOtp(email, otp);
      setStep(STEP.reset);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const resetPw = async e => {
    e.preventDefault(); setError('');
    if (pw !== pw2) { setError('Passwords do not match'); return; }
    if (pw.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      await api.resetPassword(email, otp, pw);
      setStep(STEP.done);
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  };

  const inputStyle = {
    width: '100%', padding: '11px 14px', borderRadius: 10,
    background: 'rgba(255,255,255,0.05)', border: '1.5px solid rgba(255,255,255,0.1)',
    color: '#f1f5f9', fontSize: 14, outline: 'none', boxSizing: 'border-box',
    transition: 'border-color 0.15s',
  };

  const steps = [STEP.email, STEP.otp, STEP.reset];
  const currentIdx = steps.indexOf(step);

  return (
    <div style={{
      display: 'flex', minHeight: '100vh', alignItems: 'center', justifyContent: 'center',
      background: '#060612', fontFamily: 'Inter, system-ui, sans-serif', padding: '24px',
    }}>
      {/* Glow blobs */}
      <div style={{ position:'fixed', top:-120, left:-80, width:400, height:400, borderRadius:'50%', background:'rgba(255,107,53,0.07)', filter:'blur(80px)', pointerEvents:'none' }} />
      <div style={{ position:'fixed', bottom:-80, right:-60, width:320, height:320, borderRadius:'50%', background:'rgba(139,92,246,0.08)', filter:'blur(70px)', pointerEvents:'none' }} />

      <div style={{ width: '100%', maxWidth: 420, position: 'relative', zIndex: 1 }}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 52, height: 52, borderRadius: 16, margin: '0 auto 12px',
            background: 'linear-gradient(135deg, #FF6B35, #ff9a6c)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 24, boxShadow: '0 8px 24px rgba(255,107,53,0.4)',
          }}>🏠</div>
          <div style={{ fontSize: 20, fontWeight: 900, color: '#fff' }}>PGease</div>
          <div style={{ fontSize: 11, color: '#64748b', letterSpacing: 2, textTransform: 'uppercase', marginTop: 2 }}>Password Reset</div>
        </div>

        {/* Card */}
        <div style={{
          background: '#111118', border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 18, padding: '32px',
          boxShadow: '0 24px 64px rgba(0,0,0,0.5)',
        }}>
          {/* Progress dots */}
          {step !== STEP.done && (
            <div style={{ display: 'flex', gap: 6, marginBottom: 28, justifyContent: 'center' }}>
              {steps.map((s, i) => (
                <div key={s} style={{
                  height: 4, flex: 1, borderRadius: 4,
                  background: i <= currentIdx ? 'linear-gradient(90deg,#FF6B35,#ff9a6c)' : 'rgba(255,255,255,0.08)',
                  transition: 'background 0.3s',
                }} />
              ))}
            </div>
          )}

          {error && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 16,
              background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.25)',
              fontSize: 13, color: '#f87171',
            }}>{error}</div>
          )}

          {/* Step 1: Email */}
          {step === STEP.email && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 6px' }}>Forgot password?</h2>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>Enter your registered email — we'll send a reset code.</p>
              <form onSubmit={sendOtp}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Email Address</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="you@email.com" required style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#FF6B35'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '13px', borderRadius: 11, border: 'none', marginTop: 20,
                  background: loading ? 'rgba(255,107,53,0.5)' : 'linear-gradient(135deg, #FF6B35, #ff9a6c)',
                  color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(255,107,53,0.35)',
                }}>
                  {loading ? 'Sending…' : 'Send Reset Code →'}
                </button>
              </form>
            </>
          )}

          {/* Step 2: OTP */}
          {step === STEP.otp && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 6px' }}>Check your email</h2>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>
                Enter the 6-digit code sent to <strong style={{ color: '#94a3b8' }}>{email}</strong>
              </p>
              <form onSubmit={verifyOtp}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Reset Code</label>
                <input type="text" value={otp} onChange={e => setOtp(e.target.value.replace(/\D/g,'').slice(0,6))}
                  placeholder="123456" required maxLength={6} style={{ ...inputStyle, letterSpacing: 6, fontSize: 20, textAlign: 'center' }}
                  onFocus={e => e.target.style.borderColor = '#FF6B35'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button type="submit" disabled={loading || otp.length < 6} style={{
                  width: '100%', padding: '13px', borderRadius: 11, border: 'none', marginTop: 20,
                  background: (loading || otp.length < 6) ? 'rgba(255,107,53,0.4)' : 'linear-gradient(135deg, #FF6B35, #ff9a6c)',
                  color: '#fff', fontSize: 15, fontWeight: 700, cursor: (loading || otp.length < 6) ? 'not-allowed' : 'pointer',
                  boxShadow: (loading || otp.length < 6) ? 'none' : '0 4px 20px rgba(255,107,53,0.35)',
                }}>
                  {loading ? 'Verifying…' : 'Verify Code →'}
                </button>
              </form>
              <button onClick={() => setStep(STEP.email)} style={{
                width: '100%', marginTop: 10, padding: '10px', background: 'none', border: 'none',
                color: '#64748b', fontSize: 13, cursor: 'pointer',
              }}>← Back</button>
            </>
          )}

          {/* Step 3: New Password */}
          {step === STEP.reset && (
            <>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', margin: '0 0 6px' }}>New password</h2>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 24 }}>Choose a strong password for your account.</p>
              <form onSubmit={resetPw}>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>New Password</label>
                <div style={{ position: 'relative', marginBottom: 14 }}>
                  <input type={showPw ? 'text' : 'password'} value={pw} onChange={e => setPw(e.target.value)}
                    placeholder="••••••••" required minLength={6}
                    style={{ ...inputStyle, paddingRight: 42 }}
                    onFocus={e => e.target.style.borderColor = '#FF6B35'}
                    onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                  />
                  <button type="button" onClick={() => setShowPw(s => !s)}
                    style={{ position:'absolute', right:12, top:'50%', transform:'translateY(-50%)', background:'none', border:'none', cursor:'pointer', fontSize:14, color:'#64748b', padding:4 }}>
                    {showPw ? '🙈' : '👁'}
                  </button>
                </div>
                <label style={{ fontSize: 12, fontWeight: 600, color: '#94a3b8', display: 'block', marginBottom: 6 }}>Confirm Password</label>
                <input type={showPw ? 'text' : 'password'} value={pw2} onChange={e => setPw2(e.target.value)}
                  placeholder="••••••••" required
                  style={inputStyle}
                  onFocus={e => e.target.style.borderColor = '#FF6B35'}
                  onBlur={e => e.target.style.borderColor = 'rgba(255,255,255,0.1)'}
                />
                <button type="submit" disabled={loading} style={{
                  width: '100%', padding: '13px', borderRadius: 11, border: 'none', marginTop: 20,
                  background: loading ? 'rgba(255,107,53,0.5)' : 'linear-gradient(135deg, #FF6B35, #ff9a6c)',
                  color: '#fff', fontSize: 15, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(255,107,53,0.35)',
                }}>
                  {loading ? 'Resetting…' : 'Reset Password →'}
                </button>
              </form>
            </>
          )}

          {/* Done */}
          {step === STEP.done && (
            <div style={{ textAlign: 'center', padding: '8px 0' }}>
              <div style={{
                width: 64, height: 64, borderRadius: '50%', margin: '0 auto 20px',
                background: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28,
              }}>✓</div>
              <h2 style={{ fontSize: 22, fontWeight: 800, color: '#f1f5f9', marginBottom: 8 }}>Password reset!</h2>
              <p style={{ color: '#64748b', fontSize: 13, marginBottom: 28 }}>Your password has been updated. You can now sign in.</p>
              <button onClick={() => navigate('/login')} style={{
                width: '100%', padding: '13px', borderRadius: 11, border: 'none',
                background: 'linear-gradient(135deg, #FF6B35, #ff9a6c)',
                color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(255,107,53,0.35)',
              }}>
                Sign In →
              </button>
            </div>
          )}
        </div>

        {/* Back to login link */}
        {step !== STEP.done && (
          <div style={{ textAlign: 'center', marginTop: 20 }}>
            <Link to="/login" style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>
              ← Back to Sign In
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
