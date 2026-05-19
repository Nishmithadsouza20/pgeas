import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';

const PLAN_COLOR = { basic:'#3b82f6', premium:'#FF6B35', enterprise:'#8b5cf6' };
const PLAN_LABEL = { basic:'Basic', premium:'Premium', enterprise:'Enterprise' };

const PROPERTY_LABELS = {
  pg:        { residents: 'Residents', rooms: 'Rooms',  portal: 'Resident Portal' },
  lodge:     { residents: 'Occupants', rooms: 'Rooms',  portal: 'My Stay' },
  dormitory: { residents: 'Occupants', rooms: 'Beds',   portal: 'My Stay' },
  hostel:    { residents: 'Students',  rooms: 'Rooms',  portal: 'My Stay' },
  apartment: { residents: 'Tenants',   rooms: 'Units',  portal: 'My Stay' },
};

const ADMIN_NAV = [
  { label:'PLATFORM', items:[
    { path:'/dashboard', icon:'🏢', label:'Platform Home' },
    { path:'/analytics', icon:'📈', label:'Analytics' },
  ]},
];

const HAS_MESS     = ['pg', 'hostel', 'dormitory'];
const HAS_GATEPASS = ['pg', 'hostel', 'dormitory'];

function buildOwnerNav(pt) {
  const lbl = PROPERTY_LABELS[pt] || PROPERTY_LABELS.pg;

  const mgmtItems = [
    { path:'/rooms',       icon:'🚪', label: lbl.rooms },
    { path:'/residents',   icon:'👥', label: lbl.residents },
    { path:'/payments',    icon:'💳', label:'Payments' },
    { path:'/visitors',    icon:'🚶', label:'Visitors' },
    { path:'/maintenance', icon:'🔧', label:'Maintenance' },
    { path:'/enquiries',   icon:'📋', label:'Enquiries' },
  ];
  if (HAS_GATEPASS.includes(pt)) mgmtItems.splice(4, 0, { path:'/gatepass', icon:'🎫', label:'Gate Pass' });

  const commItems = [
    { path:'/complaints', icon:'📢', label:'Complaints' },
    { path:'/notices',    icon:'📌', label:'Notices' },
    { path:'/mess',       icon:'🍽️', label:'Mess Menu' },
  ];
  if (HAS_MESS.includes(pt)) commItems.push({ path:'/meals', icon:'🥘', label:'Meal Attendance' });

  return [
    { label:'OVERVIEW', items:[
      { path:'/dashboard',   icon:'📊', label:'Dashboard' },
      { path:'/analytics',   icon:'📈', label:'Analytics' },
    ]},
    { label:'MANAGEMENT', items: mgmtItems },
    { label:'FINANCE', items:[
      { path:'/invoices',    icon:'🧾', label:'Invoices' },
      { path:'/deposits',    icon:'🏦', label:'Deposits' },
      { path:'/expenses',    icon:'💰', label:'Expenses' },
      { path:'/reports',     icon:'📊', label:'Reports' },
    ]},
    { label:'HR', items:[
      { path:'/staff',       icon:'👨‍💼', label:'Staff' },
      { path:'/attendance',  icon:'📅', label:'Attendance' },
      { path:'/payroll',     icon:'💵', label:'Payroll' },
    ]},
    { label:'COMMUNICATION', items: commItems },
    { label:'SETTINGS', items:[
      { path:'/settings',    icon:'⚙️', label:'Property Settings' },
    ]},
  ];
}

const RESIDENT_NAV = [
  { label:'MY SPACE', items:[
    { path:'/dashboard',   icon:'🏠', label:'My Dashboard' },
    { path:'/payments',    icon:'💳', label:'My Payments' },
    { path:'/maintenance', icon:'🔧', label:'Maintenance' },
    { path:'/gatepass',    icon:'🎫', label:'Gate Pass' },
    { path:'/complaints',  icon:'📢', label:'Complaints' },
    { path:'/mess',        icon:'🍽️', label:'Mess Menu' },
    { path:'/notices',     icon:'📌', label:'Notices' },
  ]},
];

export default function Sidebar({ collapsed, setCollapsed, mobileOpen, setMobileOpen }) {
  const { user, company, logout } = useAuth();
  const { theme, toggle } = useTheme();
  const navigate = useNavigate();

  const handleLogout = () => { logout(); navigate('/login'); };

  const pt = company?.property_type || 'pg';
  const lbl = PROPERTY_LABELS[pt] || PROPERTY_LABELS.pg;

  const navGroups = user?.role === 'super_admin' ? ADMIN_NAV
                  : user?.role === 'owner'        ? buildOwnerNav(pt)
                  : RESIDENT_NAV;

  const roleSub = user?.role === 'super_admin' ? 'Platform Console'
                : user?.role === 'owner'        ? 'Property Management'
                : lbl.portal;

  return (
    <div className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
      {/* Logo */}
      <div className="sidebar-logo" onClick={() => setCollapsed(c => !c)}>
        <div className="logo-icon" style={{ overflow:'hidden', display:'flex', alignItems:'center', justifyContent:'center' }}>
          {company?.pg_logo?.startsWith('data:') || company?.pg_logo?.startsWith('http')
            ? <img src={company.pg_logo} alt="logo" style={{ width:32, height:32, objectFit:'cover', borderRadius:6 }} />
            : (company?.pg_logo || '🏠')}
        </div>
        {!collapsed && (
          <div style={{ overflow:'hidden' }}>
            <div className="logo-text">PGease</div>
            <div className="logo-sub">{roleSub}</div>
          </div>
        )}
      </div>

      {/* User */}
      {!collapsed && user && (
        <div className="sidebar-user">
          <div className="avatar" style={{ width:34, height:34, fontSize:13 }}>
            {user.name?.charAt(0).toUpperCase()}
          </div>
          <div style={{ overflow:'hidden', flex:1 }}>
            <div className="user-name">{user.name}</div>
            <div className="user-role">{user.role?.replace('_',' ')}</div>
          </div>
        </div>
      )}
      {/* Plan badge — owners only */}
      {!collapsed && user?.role === 'owner' && company?.plan && (
        <div style={{
          margin:'0 12px 8px', padding:'7px 12px', borderRadius:8,
          background: `${PLAN_COLOR[company.plan] || 'var(--accent)'}15`,
          border: `1px solid ${PLAN_COLOR[company.plan] || 'var(--accent)'}40`,
          display:'flex', alignItems:'center', justifyContent:'space-between',
        }}>
          <div>
            <div style={{ fontSize:10, color:'var(--text-3)', fontWeight:600, textTransform:'uppercase', letterSpacing:0.5 }}>Plan</div>
            <div style={{ fontSize:12, fontWeight:800, color: PLAN_COLOR[company.plan] }}>
              {PLAN_LABEL[company.plan] || company.plan}
            </div>
          </div>
          <div style={{ textAlign:'right' }}>
            <div style={{ fontSize:10, color:'var(--text-3)' }}>₹{(company.subscription_amount||0).toLocaleString()}</div>
            <div style={{ fontSize:9, color:'var(--text-3)', marginTop:1 }}>/month</div>
          </div>
        </div>
      )}
      {collapsed && user && (
        <div style={{ padding:'12px 14px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'center' }}>
          <div className="avatar" style={{ width:34, height:34, fontSize:13 }}>{user.name?.charAt(0)}</div>
        </div>
      )}

      {/* Nav */}
      <nav className="sidebar-nav">
        {navGroups.map(group => (
          <div key={group.label} style={{ marginBottom:8 }}>
            {!collapsed && <div className="nav-section-label">{group.label}</div>}
            {group.items.map(item => (
              <NavLink key={item.path+item.label} to={item.path}
                className={({ isActive }) => `nav-item ${isActive ? 'active' : ''}`}
                title={collapsed ? item.label : ''}
                onClick={() => setMobileOpen && setMobileOpen(false)}>
                <span className="nav-icon">{item.icon}</span>
                {!collapsed && <span>{item.label}</span>}
              </NavLink>
            ))}
          </div>
        ))}
      </nav>

      {/* Footer */}
      <div className="sidebar-footer">
        <button className="theme-btn" onClick={toggle} title="Toggle theme">
          <span className="nav-icon">{theme === 'dark' ? '☀️' : '🌙'}</span>
          {!collapsed && <span>{theme === 'dark' ? 'Light Mode' : 'Dark Mode'}</span>}
        </button>
        <button className="theme-btn" style={{ color:'var(--danger)' }} onClick={handleLogout} title="Logout">
          <span className="nav-icon">🚪</span>
          {!collapsed && <span>Logout</span>}
        </button>
      </div>
    </div>
  );
}
