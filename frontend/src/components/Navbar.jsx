import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

const TITLES = {
  '/dashboard':   ['Dashboard',          'Overview of your property operations'],
  '/rooms':       ['Rooms',              'Manage all rooms and bed allocations'],
  '/residents':   ['Residents',          'View and manage all residents'],
  '/payments':    ['Payments',           'Rent collection and payment history'],
  '/complaints':  ['Complaints',         'Track and resolve resident complaints'],
  '/mess':        ['Mess Menu',          'Weekly food menu management'],
  '/notices':     ['Notices',            'Post and manage notices for residents'],
  '/visitors':    ['Visitors',           'Visitor entry and exit log'],
  '/analytics':   ['Analytics',          'Platform insights and performance charts'],
  '/staff':       ['Staff',              'Manage employees and shifts'],
  '/expenses':    ['Expenses',           'Track expenses and food inventory'],
  '/settings':    ['Settings',           'Customize your property branding and preferences'],
  '/attendance':  ['Attendance',         'Mark and review daily staff attendance'],
  '/payroll':     ['Payroll',            'Generate and manage monthly staff payroll'],
  '/maintenance': ['Maintenance',        'Track and resolve maintenance work orders'],
  '/gatepass':    ['Gate Pass',          'Manage resident gate pass requests'],
  '/invoices':    ['Invoices',           'Monthly rent invoices for all residents'],
  '/deposits':    ['Deposits',           'Track security deposits and refunds'],
  '/reports':     ['Reports',            'P&L report, rent roll, defaulters and occupancy'],
  '/enquiries':   ['Enquiries',          'Manage prospective tenant leads and follow-ups'],
  '/meals':       ['Meal Attendance',    'Track daily breakfast, lunch and dinner per resident'],
};

export default function Topbar({ onHamburger }) {
  const { user, company } = useAuth();
  const { theme, toggle } = useTheme();
  const loc  = useLocation();

  const isAdmin = user?.role === 'super_admin';
  const info    = TITLES[loc.pathname] || ['PGease', ''];
  const title   = isAdmin && loc.pathname === '/dashboard' ? 'Platform Console' : info[0];
  const sub     = isAdmin && loc.pathname === '/dashboard' ? 'PGease — All client properties' : info[1];

  const today = new Date().toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric',
  });

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="hamburger" onClick={onHamburger} aria-label="Toggle menu">☰</button>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div className="page-title">{title}</div>
            {company?.plan && user?.role === 'owner' && (
              <span style={{
                fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 20,
                background: company.plan === 'enterprise' ? 'rgba(139,92,246,0.12)' :
                            company.plan === 'premium'    ? 'rgba(255,107,53,0.12)'  :
                                                            'rgba(59,130,246,0.12)',
                color:      company.plan === 'enterprise' ? '#8b5cf6' :
                            company.plan === 'premium'    ? '#FF6B35'  : '#3b82f6',
                border:     `1px solid ${
                              company.plan === 'enterprise' ? 'rgba(139,92,246,0.25)' :
                              company.plan === 'premium'    ? 'rgba(255,107,53,0.25)'  :
                                                              'rgba(59,130,246,0.25)' }`,
                textTransform: 'uppercase', letterSpacing: 0.5,
              }}>
                {company.plan}
              </span>
            )}
          </div>
          {sub && <div className="page-sub">{sub}</div>}
        </div>
      </div>

      <div className="topbar-right">
        {/* Date */}
        <div className="topbar-date" style={{ fontSize: 12, color: 'var(--text-3)', fontWeight: 500 }}>
          {today}
        </div>

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        {/* Notifications */}
        <NotificationBell />

        <div style={{ width: 1, height: 20, background: 'var(--border)' }} />

        {/* Theme toggle */}
        <button
          className="btn btn-ghost btn-sm"
          onClick={toggle}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          style={{ gap: 6, padding: '5px 10px' }}
        >
          {theme === 'dark' ? '☀️' : '🌙'}
          <span className="topbar-theme-label" style={{ fontSize: 12 }}>
            {theme === 'dark' ? 'Light' : 'Dark'}
          </span>
        </button>

        {/* User avatar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div
            className="avatar"
            style={{ width: 32, height: 32, fontSize: 13, cursor: 'default' }}
            title={user?.name}
          >
            {user?.name?.charAt(0)?.toUpperCase()}
          </div>
        </div>
      </div>
    </div>
  );
}
