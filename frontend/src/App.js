import React, { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import ProtectedRoute from './components/ProtectedRoute';
import Sidebar from './components/Sidebar';
import Topbar from './components/Navbar';

import Login          from './pages/Login';
import ForgotPassword from './pages/ForgotPassword';

import Dashboard  from './pages/Dashboard';
import Rooms      from './pages/Rooms';
import Residents  from './pages/Residents';
import Payments   from './pages/Payments';
import Complaints from './pages/Complaints';
import MessMenu   from './pages/MessMenu';
import Notices    from './pages/Notices';
import Visitors   from './pages/Visitors';
import Analytics  from './pages/Analytics';
import Staff      from './pages/Staff';
import Expenses   from './pages/Expenses';
import Settings    from './pages/Settings';
import Attendance  from './pages/Attendance';
import Payroll     from './pages/Payroll';
import Maintenance from './pages/Maintenance';
import GatePass    from './pages/GatePass';
import Invoices    from './pages/Invoices';
import Deposits    from './pages/Deposits';
import Reports     from './pages/Reports';
import Enquiries      from './pages/Enquiries';
import MealAttendance from './pages/MealAttendance';

const PLAN_UPGRADE_COLORS = { basic:'#3b82f6', premium:'#FF6B35', enterprise:'#8b5cf6' };

function Shell({ children }) {
  const [collapsed,   setCollapsed]   = useState(false);
  const [mobileOpen,  setMobileOpen]  = useState(false);
  const { user, planAlert, setPlanAlert } = useAuth();
  if (!user) return children;
  return (
    <div className="app-shell">
      <Sidebar collapsed={collapsed} setCollapsed={setCollapsed}
               mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      {mobileOpen && <div className="sidebar-overlay" onClick={() => setMobileOpen(false)} />}
      <div className="page-area">
        <Topbar onHamburger={() => setMobileOpen(o => !o)} />
        {/* Real-time plan/status alert for owners */}
        {planAlert && planAlert.map((ch, i) => (
          <div key={i} style={{
            margin:'0 20px 0', padding:'10px 18px',
            background: ch.field === 'plan'
              ? `linear-gradient(90deg,${PLAN_UPGRADE_COLORS[ch.now]||'var(--accent)'}18,transparent)`
              : 'rgba(245,158,11,0.1)',
            border:`1px solid ${ch.field === 'plan' ? (PLAN_UPGRADE_COLORS[ch.now]||'var(--accent)')+'40' : 'rgba(245,158,11,0.3)'}`,
            borderRadius:10, display:'flex', alignItems:'center', gap:12,
            animation:'fadeIn 0.3s ease',
          }}>
            <span style={{ fontSize:18 }}>{ch.field === 'plan' ? '🎉' : '📢'}</span>
            <div style={{ flex:1, fontSize:13 }}>
              {ch.field === 'plan'
                ? <><strong style={{ color: PLAN_UPGRADE_COLORS[ch.now]||'var(--accent)' }}>Plan updated!</strong> Your subscription has changed from <strong>{ch.old?.toUpperCase()}</strong> to <strong style={{ color: PLAN_UPGRADE_COLORS[ch.now] }}>{ch.now?.toUpperCase()}</strong>. New features are now available.</>
                : <><strong>Account status changed</strong> from <strong>{ch.old}</strong> to <strong style={{ color:'var(--warning)' }}>{ch.now}</strong>.</>}
            </div>
            <button onClick={() => setPlanAlert(null)} style={{ background:'none', border:'none', cursor:'pointer', color:'var(--text-3)', fontSize:16, padding:'0 4px' }}>✕</button>
          </div>
        ))}
        <div className="page-body">{children}</div>
      </div>
    </div>
  );
}

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Shell>
      <Routes>
        <Route path="/login"           element={user ? <Navigate to="/dashboard" /> : <Login />} />
        <Route path="/forgot-password" element={user ? <Navigate to="/dashboard" /> : <ForgotPassword />} />


        <Route path="/dashboard"  element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
        <Route path="/complaints" element={<ProtectedRoute><Complaints /></ProtectedRoute>} />
        <Route path="/mess"       element={<ProtectedRoute><MessMenu /></ProtectedRoute>} />
        <Route path="/notices"    element={<ProtectedRoute><Notices /></ProtectedRoute>} />
        <Route path="/payments"   element={<ProtectedRoute><Payments /></ProtectedRoute>} />
        <Route path="/analytics"  element={<ProtectedRoute roles={['super_admin','owner']}><Analytics /></ProtectedRoute>} />
        <Route path="/rooms"      element={<ProtectedRoute roles={['owner']}><Rooms /></ProtectedRoute>} />
        <Route path="/residents"  element={<ProtectedRoute roles={['owner']}><Residents /></ProtectedRoute>} />
        <Route path="/visitors"   element={<ProtectedRoute roles={['owner']}><Visitors /></ProtectedRoute>} />
        <Route path="/staff"      element={<ProtectedRoute roles={['owner']}><Staff /></ProtectedRoute>} />
        <Route path="/expenses"   element={<ProtectedRoute roles={['owner']}><Expenses /></ProtectedRoute>} />
        <Route path="/settings"    element={<ProtectedRoute roles={['owner']}><Settings /></ProtectedRoute>} />
        <Route path="/attendance"  element={<ProtectedRoute roles={['owner']}><Attendance /></ProtectedRoute>} />
        <Route path="/payroll"     element={<ProtectedRoute roles={['owner']}><Payroll /></ProtectedRoute>} />
        <Route path="/maintenance" element={<ProtectedRoute><Maintenance /></ProtectedRoute>} />
        <Route path="/gatepass"    element={<ProtectedRoute><GatePass /></ProtectedRoute>} />
        <Route path="/invoices"    element={<ProtectedRoute roles={['owner']}><Invoices /></ProtectedRoute>} />
        <Route path="/deposits"    element={<ProtectedRoute roles={['owner']}><Deposits /></ProtectedRoute>} />
        <Route path="/reports"     element={<ProtectedRoute roles={['owner']}><Reports /></ProtectedRoute>} />
        <Route path="/enquiries"    element={<ProtectedRoute roles={['owner']}><Enquiries /></ProtectedRoute>} />
        <Route path="/meals"     element={<ProtectedRoute roles={['owner']}><MealAttendance /></ProtectedRoute>} />

        <Route path="*" element={<Navigate to={user ? "/dashboard" : "/login"} />} />
      </Routes>
    </Shell>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <ToastProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </ToastProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
