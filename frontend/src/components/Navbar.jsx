import React from 'react';
import { useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import NotificationBell from './NotificationBell';

const TITLES = {
  '/dashboard':   ['Dashboard',          'Overview of your property operations'],
  '/rooms':       ['Room Management',    'Manage all rooms and allocations'],
  '/residents':   ['Residents',          'View and manage all residents'],
  '/payments':    ['Payments',           'Rent collection and payment history'],
  '/complaints':  ['Complaints',         'Track and resolve resident complaints'],
  '/mess':        ['Mess Menu',          'Weekly food menu management'],
  '/notices':     ['Notice Board',       'Post and manage notices for residents'],
  '/visitors':    ['Visitors',           'Visitor entry and exit log'],
  '/analytics':   ['Analytics',          'Platform insights and performance charts'],
  '/staff':       ['Staff Management',   'Manage employees and shifts'],
  '/expenses':    ['Expenses',           'Track expenses and food inventory'],
  '/settings':    ['Property Settings',  'Customize your property branding and contact info'],
  '/attendance':  ['Attendance',         'Mark and review daily staff attendance'],
  '/payroll':     ['Payroll',            'Generate and manage monthly staff payroll'],
  '/maintenance': ['Maintenance',        'Track and resolve maintenance work orders'],
  '/gatepass':    ['Gate Pass',          'Manage resident gate pass requests'],
  '/invoices':    ['Invoices',           'Monthly rent invoices for all residents'],
  '/deposits':    ['Security Deposits',  'Track security deposits and refunds'],
  '/reports':     ['Reports',            'P&L report, rent roll, defaulters and occupancy'],
  '/enquiries':   ['Enquiries',          'Manage prospective tenant leads and follow-ups'],
  '/meals':       ['Meal Attendance',    'Track daily breakfast, lunch and dinner per resident'],
};

export default function Topbar({ onHamburger }) {
  const { user } = useAuth();
  const { theme, toggle } = useTheme();
  const loc  = useLocation();
  const info = TITLES[loc.pathname] || ['PGease', ''];

  const isAdmin = user?.role === 'super_admin';
  const title   = isAdmin && loc.pathname === '/dashboard' ? 'Platform Console' : info[0];
  const sub     = isAdmin && loc.pathname === '/dashboard' ? 'PGease — Manage all client properties' : info[1];

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="hamburger" onClick={onHamburger} aria-label="Menu">☰</button>
        <div>
          <div className="page-title">{title}</div>
          {sub && <div className="page-sub">{sub}</div>}
        </div>
      </div>
      <div className="topbar-right">
        <div className="topbar-date" style={{ fontSize:12, color:'var(--text-2)' }}>
          {new Date().toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
        </div>
        <div style={{ width:1, height:20, background:'var(--border)' }} />
        <NotificationBell />
        <div style={{ width:1, height:20, background:'var(--border)' }} />
        <button className="btn btn-ghost btn-sm" onClick={toggle} style={{ gap:6 }}>
          {theme === 'dark' ? '☀️' : '🌙'}<span className="topbar-theme-label">{theme === 'dark' ? ' Light' : ' Dark'}</span>
        </button>
        <div style={{ display:'flex', alignItems:'center', gap:8 }}>
          <div className="avatar" style={{ width:32, height:32, fontSize:13 }}>
            {user?.name?.charAt(0)}
          </div>
        </div>
      </div>
    </div>
  );
}
