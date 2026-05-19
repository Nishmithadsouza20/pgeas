import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PieChart,Pie,Cell,BarChart,Bar,XAxis,YAxis,Tooltip,ResponsiveContainer,Legend,LineChart,Line,CartesianGrid,Area,AreaChart } from 'recharts';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#FF6B35','#22c55e','#3b82f6','#f59e0b','#8b5cf6','#ec4899'];
const TT = { background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-1)', borderRadius:10, fontSize:12 };

/* ══════════════════════════════════════════════════════════════════
   SUPER ADMIN — PGease SaaS Platform Console
   ══════════════════════════════════════════════════════════════════ */
const PLAN_COLOR  = { basic:'#3b82f6', premium:'#FF6B35', enterprise:'#8b5cf6' };
const STATUS_DOT  = { active:'var(--success)', trial:'var(--warning)', inactive:'var(--danger)' };
const PLAN_BADGE  = { basic:'badge-info', premium:'badge-warning', enterprise:'badge-purple' };

function PlatformDashboard() {
  const navigate = useNavigate();
  const [stats,      setStats]      = useState(null);
  const [companies,  setCompanies]  = useState([]);
  const [activity,   setActivity]   = useState({ recent_clients:[], mrr_trend:[], total_users:0 });
  const [loading,    setLoading]    = useState(true);
  const [activeTab,  setActiveTab]  = useState('overview');

  // Client modals
  const [provModal,   setProvModal]   = useState(false);
  const [editModal,   setEditModal]   = useState(null);
  const [pwModal,     setPwModal]     = useState(null);
  const [delConfirm,  setDelConfirm]  = useState(null);
  const [newPw,       setNewPw]       = useState('');
  const [provErr,     setProvErr]     = useState('');
  const [editErr,     setEditErr]     = useState('');
  const [planFilter,  setPlanFilter]  = useState('all');
  const [statusFilter,setStatusFilter]= useState('all');
  const [search,      setSearch]      = useState('');

  const PROV_EMPTY = {
    company_name:'', owner_name:'', owner_email:'', owner_password:'', phone:'',
    city:'', address:'', plan:'basic', status:'trial', total_rooms:'', property_type:'pg',
    website:'', gst_number:'', floors_count:'1', contract_months:'12',
    billing_cycle_day:'1', onboarding_notes:'', send_welcome_email:true,
  };
  const [pForm, setPForm] = useState(PROV_EMPTY);
  const [provStep, setProvStep] = useState(1);
  const [eForm, setEForm] = useState({});

  // Client profile drawer
  const [profileClient, setProfileClient] = useState(null);
  const [profileTab,    setProfileTab]    = useState('overview');
  const [billing,       setBilling]       = useState([]);
  const [clientEmails,  setClientEmails]  = useState([]);
  const [billingLoading,setBillingLoading]= useState(false);
  const [emailForm,     setEmailForm]     = useState({ subject:'', body:'' });
  const [emailSending,  setEmailSending]  = useState(false);
  const [newBill,       setNewBill]       = useState({ month:'', year:'', notes:'' });

  const load = () => Promise.all([
    api.get('/companies/stats'),
    api.get('/companies/'),
    api.get('/companies/stats/activity'),
  ]).then(([s, c, a]) => { setStats(s); setCompanies(c); setActivity(a); })
    .catch(console.error).finally(() => setLoading(false));

  useEffect(() => { load(); }, []);

  const pHandle   = e => setPForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const eHandle   = e => setEForm(f => ({ ...f, [e.target.name]: e.target.value }));

  const provision = async e => {
    e.preventDefault(); setProvErr('');
    try {
      await api.provisionClient({
        ...pForm,
        total_rooms:   Number(pForm.total_rooms   || 0),
        floors_count:  Number(pForm.floors_count  || 1),
        contract_months: Number(pForm.contract_months || 12),
        billing_cycle_day: Number(pForm.billing_cycle_day || 1),
      });
      setProvModal(false); setPForm(PROV_EMPTY); setProvStep(1); load();
    } catch(err) { setProvErr(err.message); }
  };

  const openEdit = c => {
    setEForm({
      company_name: c.company_name, owner_name: c.owner_name, owner_email: c.owner_email,
      phone: c.phone||'', city: c.city||'', address: c.address||'',
      plan: c.plan, status: c.status, total_rooms: String(c.total_rooms||0),
      pg_logo: c.pg_logo||'🏠', pg_tagline: c.pg_tagline||'',
    });
    setEditErr(''); setEditModal(c);
  };

  const saveEdit = async e => {
    e.preventDefault(); setEditErr('');
    try {
      await api.updateCompany(editModal.id, { ...eForm, total_rooms: Number(eForm.total_rooms) });
      setEditModal(null); load();
    } catch(err) { setEditErr(err.message); }
  };

  const resetPassword = async e => {
    e.preventDefault();
    if (!newPw || newPw.length < 6) { alert('Password must be at least 6 characters'); return; }
    try {
      const res = await api.resetOwnerPassword(pwModal.id, { new_password: newPw });
      alert(res.message);
      setPwModal(null); setNewPw('');
    } catch(err) { alert(err.message); }
  };

  const changeStatus = async (id, status) => {
    try { await api.updateCompany(id, { status }); load(); } catch(err) { alert(err.message); }
  };

  const deleteClient = async (id) => {
    try { await api.delete(`/companies/${id}`); setDelConfirm(null); load(); } catch(err) { alert(err.message); }
  };

  const openProfile = async (c) => {
    setProfileClient(c); setProfileTab('overview');
    setBillingLoading(true);
    try {
      const [b, e] = await Promise.all([api.getClientBilling(c.id), api.getClientEmails(c.id)]);
      setBilling(b); setClientEmails(e);
    } catch(err) { console.error(err); }
    finally { setBillingLoading(false); }
  };

  const markBillingPaid = async (pid) => {
    try {
      await api.updateBillingEntry(profileClient.id, pid, { status:'paid', payment_method:'bank_transfer' });
      const b = await api.getClientBilling(profileClient.id);
      setBilling(b);
    } catch(err) { alert(err.message); }
  };

  const generateInvoice = async () => {
    const today = new Date();
    try {
      await api.createBillingEntry(profileClient.id, {
        month: parseInt(newBill.month || today.getMonth()+1),
        year:  parseInt(newBill.year  || today.getFullYear()),
        notes: newBill.notes,
      });
      const b = await api.getClientBilling(profileClient.id);
      setBilling(b);
      setNewBill({ month:'', year:'', notes:'' });
    } catch(err) { alert(err.message); }
  };

  const sendEmail = async () => {
    if (!emailForm.subject || !emailForm.body) return;
    setEmailSending(true);
    try {
      await api.sendClientEmail(profileClient.id, emailForm);
      const e = await api.getClientEmails(profileClient.id);
      setClientEmails(e);
      setEmailForm({ subject:'', body:'' });
    } catch(err) { alert(err.message); }
    finally { setEmailSending(false); }
  };

  const sendReminder = async () => {
    const pending = billing.filter(b => b.status === 'pending');
    if (!pending.length) { alert('No pending invoices found.'); return; }
    const b = pending[0];
    await api.sendClientEmail(profileClient.id, {
      subject: `Payment Reminder — ${b.invoice_number}`,
      body: `Hi ${profileClient.owner_name},\n\nThis is a reminder that your PGease subscription payment is due.\n\nInvoice: ${b.invoice_number}\nAmount : Rs ${b.amount?.toLocaleString()}/month\nPlan   : ${b.plan?.toUpperCase()}\nDue on : ${b.due_date}\n\nPlease arrange payment at the earliest.\n\nTeam PGease`,
      email_type: 'payment_reminder',
    });
    const e = await api.getClientEmails(profileClient.id);
    setClientEmails(e);
    alert('Payment reminder sent!');
  };

  if (loading) return <div className="spinner-wrap"><div className="spinner" /><span>Loading platform…</span></div>;

  const active   = companies.filter(c => c.status === 'active');
  const trial    = companies.filter(c => c.status === 'trial');
  const inactive = companies.filter(c => c.status === 'inactive');
  const mrr      = active.reduce((s, c) => s + c.subscription_amount, 0);
  const byPlan   = ['basic','premium','enterprise'].map(p => ({
    name: p.charAt(0).toUpperCase()+p.slice(1),
    value: companies.filter(c => c.plan === p).length,
    color: PLAN_COLOR[p],
  })).filter(d => d.value > 0);
  const occupancyPct = stats?.total_rooms ? Math.round(stats.occupied_rooms / stats.total_rooms * 100) : 0;

  // Trial expiry (14-day trial)
  const today      = new Date();
  const expiringIn = (c) => {
    const reg = new Date(c.registered_at);
    const exp = new Date(reg.getTime() + 14 * 86400000);
    return Math.ceil((exp - today) / 86400000);
  };
  const expiringTrials = trial.filter(c => {
    const d = expiringIn(c);
    return d >= 0 && d <= 5;
  });

  // Growth (this month vs last month)
  const thisMonth = today.toISOString().slice(0,7);
  const lastMonth = new Date(today.getFullYear(), today.getMonth()-1, 1).toISOString().slice(0,7);
  const newThisMonth = companies.filter(c => c.registered_at?.slice(0,7) === thisMonth).length;
  const newLastMonth = companies.filter(c => c.registered_at?.slice(0,7) === lastMonth).length;
  const growthPct    = newLastMonth ? Math.round((newThisMonth - newLastMonth) / newLastMonth * 100) : 0;

  const visible = companies
    .filter(c => planFilter === 'all' || c.plan === planFilter)
    .filter(c => statusFilter === 'all' || c.status === statusFilter)
    .filter(c => !search ||
      c.company_name.toLowerCase().includes(search.toLowerCase()) ||
      c.owner_name.toLowerCase().includes(search.toLowerCase()) ||
      (c.city||'').toLowerCase().includes(search.toLowerCase()) ||
      (c.owner_email||'').toLowerCase().includes(search.toLowerCase())
    );

  return (
    <>
      {/* ── HERO ── */}
      <div style={{
        background:'linear-gradient(135deg,#0a0a18 0%,#12122a 50%,#0a1828 100%)',
        borderRadius:18, padding:'24px 28px', marginBottom:20,
        border:'1px solid rgba(255,255,255,0.07)',
        position:'relative', overflow:'hidden',
      }}>
        <div style={{ position:'absolute', top:-40, right:-40, width:200, height:200, borderRadius:'50%', background:'rgba(255,107,53,.06)', pointerEvents:'none' }} />
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', flexWrap:'wrap', gap:16, marginBottom:20 }}>
          <div>
            <div style={{ fontSize:10, color:'#FF6B35', fontWeight:700, textTransform:'uppercase', letterSpacing:3, marginBottom:8 }}>PGease SaaS Platform</div>
            <div style={{ fontSize:24, fontWeight:900, color:'#fff', letterSpacing:'-0.5px' }}>Platform Console 👑</div>
            <div style={{ fontSize:12, color:'#64748b', marginTop:6 }}>
              {companies.length} clients · {stats?.total_residents||0} residents · {active.length} active subscriptions
              {newThisMonth > 0 && (
                <span style={{ marginLeft:12, color:'#22c55e', fontWeight:600 }}>
                  +{newThisMonth} this month {growthPct > 0 ? `(↑${growthPct}%)` : growthPct < 0 ? `(↓${Math.abs(growthPct)}%)` : ''}
                </span>
              )}
            </div>
          </div>
          <div style={{ display:'flex', gap:10 }}>
            <button className="btn btn-primary" onClick={() => { setProvErr(''); setProvModal(true); }}>
              + Provision Client
            </button>
          </div>
        </div>

        {/* KPI row */}
        <div style={{ display:'grid', gridTemplateColumns:'repeat(8,1fr)', gap:10 }}>
          {[
            { label:'MRR',         value:`₹${(mrr/1000).toFixed(1)}k`,          color:'#FF6B35' },
            { label:'ARR',         value:`₹${(mrr*12/100000).toFixed(1)}L`,      color:'#22c55e' },
            { label:'Active',      value:active.length,                          color:'#22c55e' },
            { label:'Trial',       value:trial.length,                           color:'#f59e0b' },
            { label:'Inactive',    value:inactive.length,                        color:'#ef4444' },
            { label:'Rooms',       value:stats?.total_rooms||0,                  color:'#3b82f6' },
            { label:'Residents',   value:stats?.total_residents||0,              color:'#ec4899' },
            { label:'Occupancy',   value:`${occupancyPct}%`,                     color: occupancyPct>=70?'#22c55e':'#f59e0b' },
          ].map(k => (
            <div key={k.label} style={{
              background:'rgba(255,255,255,0.05)', border:'1px solid rgba(255,255,255,0.08)',
              borderRadius:12, padding:'12px 10px', textAlign:'center',
            }}>
              <div style={{ fontSize:19, fontWeight:900, color:k.color }}>{k.value}</div>
              <div style={{ fontSize:10, color:'#64748b', marginTop:3, fontWeight:600, textTransform:'uppercase', letterSpacing:0.3 }}>{k.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Trial expiry alerts */}
      {expiringTrials.length > 0 && (
        <div style={{ padding:'12px 16px', background:'rgba(245,158,11,.09)', border:'1px solid rgba(245,158,11,.3)', borderRadius:10, marginBottom:16, display:'flex', gap:12, alignItems:'center', flexWrap:'wrap' }}>
          <span style={{ fontWeight:700, color:'var(--warning)', fontSize:13 }}>Trial Expiry Alert</span>
          {expiringTrials.map(c => (
            <div key={c.id} style={{ display:'flex', alignItems:'center', gap:8, padding:'4px 10px', background:'rgba(245,158,11,.15)', borderRadius:20, fontSize:12 }}>
              <span style={{ fontWeight:600 }}>{c.company_name}</span>
              <span style={{ color:'var(--warning)', fontWeight:700 }}>{expiringIn(c) === 0 ? 'expires today' : `${expiringIn(c)}d left`}</span>
              <button className="btn btn-warning btn-xs" onClick={() => changeStatus(c.id,'active')}>Convert</button>
            </div>
          ))}
        </div>
      )}

      {/* ── TABS ── */}
      <div style={{ display:'flex', gap:0, background:'var(--bg-card)', border:'1px solid var(--border)', borderRadius:10, overflow:'hidden', marginBottom:20, width:'fit-content' }}>
        {[['overview','Overview'],['clients','Clients'],['analytics','Analytics']].map(([v,l]) => (
          <button key={v} onClick={() => setActiveTab(v)}
            className={`btn btn-sm ${activeTab===v?'btn-primary':'btn-ghost'}`}
            style={{ borderRadius:0, padding:'9px 22px' }}>
            {l}
          </button>
        ))}
      </div>

      {/* ══ OVERVIEW TAB ══ */}
      {activeTab === 'overview' && (
        <>
          <div style={{ display:'grid', gridTemplateColumns:'2fr 1fr', gap:16, marginBottom:16 }}>
            <div className="card" style={{ padding:20 }}>
              <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>MRR Growth</div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:14 }}>Active subscription revenue — last 6 months</div>
              <ResponsiveContainer width="100%" height={180}>
                <AreaChart data={activity.mrr_trend||[]}>
                  <defs>
                    <linearGradient id="mrrG" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3}/>
                      <stop offset="95%" stopColor="#FF6B35" stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                  <XAxis dataKey="month" tick={{ fill:'var(--text-2)', fontSize:11 }} />
                  <YAxis tick={{ fill:'var(--text-2)', fontSize:10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                  <Tooltip formatter={v => `₹${v.toLocaleString()}`} contentStyle={TT} />
                  <Area type="monotone" dataKey="mrr" stroke="#FF6B35" strokeWidth={2} fill="url(#mrrG)" name="MRR" />
                </AreaChart>
              </ResponsiveContainer>
            </div>

            <div style={{ display:'flex', flexDirection:'column', gap:12 }}>
              <div className="card" style={{ padding:18, flex:1 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Plans</div>
                {byPlan.map(d => (
                  <div key={d.name} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                    <div style={{ width:10, height:10, borderRadius:3, background:d.color, flexShrink:0 }} />
                    <div style={{ flex:1, fontSize:12 }}>{d.name}</div>
                    <div style={{ fontWeight:700, fontSize:13, color:d.color }}>{d.value}</div>
                    <div style={{ width:60, height:5, background:'var(--bg-hover)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${(d.value/companies.length)*100}%`, background:d.color, borderRadius:3 }} />
                    </div>
                  </div>
                ))}
              </div>
              <div className="card" style={{ padding:16 }}>
                <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Health</div>
                {[
                  { label:'Occupancy',  value:`${occupancyPct}%`, color: occupancyPct>=70?'var(--success)':'var(--warning)' },
                  { label:'Complaints', value:stats?.open_complaints||0, color:'var(--warning)' },
                  { label:'Users',      value:activity.total_users||0,   color:'var(--accent)' },
                ].map(m => (
                  <div key={m.label} style={{ display:'flex', justifyContent:'space-between', padding:'5px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
                    <span style={{ color:'var(--text-2)' }}>{m.label}</span>
                    <span style={{ fontWeight:700, color:m.color }}>{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
            {/* Recent signups */}
            <div className="card" style={{ padding:0 }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:13, fontWeight:700 }}>Recent Signups</div>
                <button className="btn btn-ghost btn-xs" onClick={() => setActiveTab('clients')}>View all →</button>
              </div>
              {(activity.recent_clients||[]).map((c,i) => (
                <div key={i} style={{ display:'flex', alignItems:'center', gap:12, padding:'11px 20px', borderBottom:'1px solid var(--border)' }}>
                  <div style={{
                    width:34, height:34, borderRadius:9, flexShrink:0,
                    background:`${PLAN_COLOR[c.plan]||'var(--accent)'}18`,
                    border:`1px solid ${PLAN_COLOR[c.plan]||'var(--accent)'}30`,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:15
                  }}>
                    {c.pg_logo && !c.pg_logo.startsWith('data:') ? c.pg_logo : '🏢'}
                  </div>
                  <div style={{ flex:1, minWidth:0 }}>
                    <div style={{ fontWeight:700, fontSize:13, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{c.company_name}</div>
                    <div style={{ fontSize:11, color:'var(--text-3)' }}>{c.owner_name} · 📍 {c.city}</div>
                  </div>
                  <div style={{ textAlign:'right', flexShrink:0 }}>
                    <span className={`badge ${PLAN_BADGE[c.plan]||'badge-info'}`}>{c.plan}</span>
                    <div style={{ fontSize:10, color:'var(--text-3)', marginTop:3 }}>{c.registered_at?.slice(0,10)}</div>
                  </div>
                </div>
              ))}
            </div>

            {/* Client status breakdown */}
            <div className="card" style={{ padding:0 }}>
              <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:13, fontWeight:700 }}>Client Status</div>
                <button className="btn btn-ghost btn-xs" onClick={() => setActiveTab('clients')}>View all →</button>
              </div>
              <div style={{ padding:'16px 20px' }}>
                {[
                  { label:'Active',   value:active.length,   color:'var(--success)' },
                  { label:'Trial',    value:trial.length,    color:'var(--warning)' },
                  { label:'Inactive', value:inactive.length, color:'var(--danger)'  },
                ].map(s => (
                  <div key={s.label} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:12 }}>
                    <div style={{ width:9, height:9, borderRadius:'50%', background:s.color, flexShrink:0 }} />
                    <div style={{ flex:1, fontSize:12, color:'var(--text-2)' }}>{s.label}</div>
                    <div style={{ fontWeight:700, fontSize:14, color:s.color, minWidth:24, textAlign:'right' }}>{s.value}</div>
                    <div style={{ width:80, height:5, background:'var(--bg-hover)', borderRadius:3, overflow:'hidden' }}>
                      <div style={{ height:'100%', width:`${companies.length ? (s.value/companies.length*100) : 0}%`, background:s.color, borderRadius:3 }} />
                    </div>
                  </div>
                ))}
                <div style={{ marginTop:10, paddingTop:10, borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', fontSize:12 }}>
                  <span style={{ color:'var(--text-3)' }}>{companies.length} total clients</span>
                  <span style={{ color:'var(--success)', fontWeight:700 }}>
                    {companies.length ? Math.round(active.length/companies.length*100) : 0}% active
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Revenue stat cards */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14 }}>
            {[
              { icon:'💰', label:'Monthly Revenue',   value:`₹${mrr.toLocaleString()}`,                 sub:`${active.length} active clients`, color:'var(--success)' },
              { icon:'📈', label:'Annual Run Rate',   value:`₹${(mrr*12/100000).toFixed(1)}L`,          sub:'Projected ARR',                  color:'#FF6B35' },
              { icon:'🔄', label:'Avg MRR / Client',  value: active.length ? `₹${Math.round(mrr/active.length).toLocaleString()}` : '—', sub:'Per active subscriber', color:'#3b82f6' },
              { icon:'🎯', label:'Conversion Rate',   value:`${companies.length ? Math.round(active.length/companies.length*100) : 0}%`, sub:'Active vs total',        color:'#8b5cf6' },
            ].map(s => (
              <div key={s.label} className="stat-card">
                <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                  <div>
                    <div className="stat-label">{s.label}</div>
                    <div className="stat-value" style={{ color:s.color, fontSize:22 }}>{s.value}</div>
                    <div className="stat-sub">{s.sub}</div>
                  </div>
                  <div style={{ fontSize:24, opacity:0.6 }}>{s.icon}</div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}

      {/* ══ CLIENTS TAB ══ */}
      {activeTab === 'clients' && (
        <div className="card" style={{ padding:0 }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center', flexWrap:'wrap', gap:10 }}>
            <div style={{ display:'flex', gap:6, alignItems:'center', flexWrap:'wrap' }}>
              <span style={{ fontSize:14, fontWeight:700, marginRight:4 }}>Clients</span>
              {['all','basic','premium','enterprise'].map(p => (
                <button key={p} className={`filter-btn ${planFilter===p?'active':''}`} onClick={() => setPlanFilter(p)} style={{ textTransform:'capitalize', fontSize:11 }}>
                  {p==='all'?`All (${companies.length})`:`${p} (${companies.filter(c=>c.plan===p).length})`}
                </button>
              ))}
              <div style={{ width:1, height:16, background:'var(--border)', margin:'0 4px' }} />
              {['all','active','trial','inactive'].map(s => (
                <button key={s} className={`filter-btn ${statusFilter===s?'active':''}`} onClick={() => setStatusFilter(s)} style={{ fontSize:11, textTransform:'capitalize' }}>
                  {s==='all'?'Any':s}
                </button>
              ))}
            </div>
            <div style={{ display:'flex', gap:8 }}>
              <input className="search-input" placeholder="Search…" value={search} onChange={e => setSearch(e.target.value)} style={{ width:180 }} />
              <button className="btn btn-primary btn-sm" onClick={() => { setProvErr(''); setProvModal(true); }}>+ New</button>
            </div>
          </div>

          <div className="table-wrap">
            <table className="pg-table">
              <thead>
                <tr><th>#</th><th>Company</th><th>Owner</th><th>Plan</th><th>MRR</th><th>Rooms</th><th>Status</th><th>Since</th><th>Actions</th></tr>
              </thead>
              <tbody>
                {visible.map((c, i) => {
                  const isTrialExpiring = c.status === 'trial' && expiringIn(c) >= 0 && expiringIn(c) <= 5;
                  return (
                    <tr key={c.id} style={{ background: isTrialExpiring ? 'rgba(245,158,11,.04)' : undefined, cursor:'pointer' }}
                      onClick={e => { if (e.target.closest('button')) return; openProfile(c); }}>
                      <td style={{ color:'var(--text-3)', fontSize:12, fontWeight:600 }}>{String(i+1).padStart(2,'0')}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
                          <div style={{
                            width:34, height:34, borderRadius:8, flexShrink:0,
                            background:`${PLAN_COLOR[c.plan]||'var(--accent)'}18`,
                            border:`1px solid ${PLAN_COLOR[c.plan]||'var(--accent)'}30`,
                            display:'flex', alignItems:'center', justifyContent:'center', fontSize:15, overflow:'hidden'
                          }}>
                            {c.pg_logo?.startsWith('data:') || c.pg_logo?.startsWith('http')
                              ? <img src={c.pg_logo} alt="" style={{ width:34, height:34, objectFit:'cover' }} />
                              : (c.pg_logo || '🏢')}
                          </div>
                          <div>
                            <div style={{ fontWeight:700, fontSize:13 }}>{c.company_name}</div>
                            <div style={{ fontSize:11, color:'var(--text-3)' }}>📍 {c.city}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div style={{ fontSize:13, fontWeight:600 }}>{c.owner_name}</div>
                        <div style={{ fontSize:11, color:'var(--text-3)' }}>{c.owner_email}</div>
                      </td>
                      <td><span className={`badge ${PLAN_BADGE[c.plan]||'badge-info'}`} style={{ textTransform:'capitalize' }}>{c.plan}</span></td>
                      <td>
                        <div style={{ fontWeight:700, color:'var(--success)' }}>₹{c.subscription_amount?.toLocaleString()}</div>
                        <div style={{ fontSize:10, color:'var(--text-3)' }}>/mo</div>
                      </td>
                      <td style={{ fontWeight:700, color:'var(--accent)' }}>{c.total_rooms}</td>
                      <td>
                        <div style={{ display:'flex', alignItems:'center', gap:5 }}>
                          <div style={{ width:7, height:7, borderRadius:'50%', background:STATUS_DOT[c.status]||'#999', flexShrink:0 }} />
                          <span style={{ fontSize:12, fontWeight:700, color:STATUS_DOT[c.status], textTransform:'capitalize' }}>{c.status}</span>
                        </div>
                        {isTrialExpiring && <div style={{ fontSize:10, color:'var(--warning)', fontWeight:600, marginTop:2 }}>{expiringIn(c)}d left</div>}
                      </td>
                      <td style={{ color:'var(--text-3)', fontSize:12 }}>{c.registered_at?.slice(0,10)}</td>
                      <td>
                        <div style={{ display:'flex', gap:4, flexWrap:'wrap' }}>
                          <button className="btn btn-ghost btn-xs" title="Edit" onClick={() => openEdit(c)}>✏️</button>
                          <button className="btn btn-ghost btn-xs" title="Reset password" onClick={() => { setPwModal(c); setNewPw(''); }}>🔑</button>
                          {c.status !== 'active'  && <button className="btn btn-success btn-xs" onClick={() => changeStatus(c.id,'active')}>Activate</button>}
                          {c.status === 'active'  && <button className="btn btn-danger  btn-xs" onClick={() => changeStatus(c.id,'inactive')}>Suspend</button>}
                          {c.status === 'inactive'&& <button className="btn btn-danger  btn-xs" onClick={() => setDelConfirm(c)} title="Delete" style={{ opacity:0.7 }}>🗑</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {visible.length === 0 && (
                  <tr><td colSpan={9} style={{ textAlign:'center', padding:60, color:'var(--text-3)' }}>
                    {search ? `No results for "${search}"` : 'No clients match the filter.'}
                  </td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div style={{ padding:'10px 20px', borderTop:'1px solid var(--border)', display:'flex', justifyContent:'space-between', fontSize:12, flexWrap:'wrap', gap:8 }}>
            <span style={{ color:'var(--text-3)' }}>Showing {visible.length} of {companies.length}</span>
            <span style={{ color:'var(--success)', fontWeight:700 }}>MRR: ₹{mrr.toLocaleString()} · ARR: ₹{(mrr*12/100000).toFixed(1)}L</span>
          </div>
        </div>
      )}



      {/* ══ ANALYTICS TAB ══ */}
      {activeTab === 'analytics' && (
        <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16 }}>
          <div className="card" style={{ padding:20 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:4 }}>MRR Trend</div>
            <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:14 }}>Last 6 months</div>
            <ResponsiveContainer width="100%" height={200}>
              <AreaChart data={activity.mrr_trend||[]}>
                <defs>
                  <linearGradient id="mrrG2" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.25}/>
                    <stop offset="95%" stopColor="#FF6B35" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="month" tick={{ fill:'var(--text-2)', fontSize:11 }} />
                <YAxis tick={{ fill:'var(--text-2)', fontSize:10 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
                <Tooltip formatter={v => `₹${v.toLocaleString()}`} contentStyle={TT} />
                <Area type="monotone" dataKey="mrr" stroke="#FF6B35" strokeWidth={2} fill="url(#mrrG2)" name="MRR" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ padding:20 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:16 }}>Plan Distribution</div>
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={byPlan} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                  label={({ name, value }) => `${name} (${value})`}>
                  {byPlan.map((d,i) => <Cell key={i} fill={d.color} />)}
                </Pie>
                <Tooltip contentStyle={TT} />
                <Legend wrapperStyle={{ fontSize:12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ padding:20 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:16 }}>Top Cities</div>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={stats?.by_city||[]} layout="vertical">
                <XAxis type="number" tick={{ fill:'var(--text-3)', fontSize:10 }} />
                <YAxis dataKey="city" type="category" tick={{ fill:'var(--text-2)', fontSize:11 }} width={80} />
                <Tooltip contentStyle={TT} />
                <Bar dataKey="count" fill="var(--accent)" radius={[0,4,4,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          <div className="card" style={{ padding:20 }}>
            <div style={{ fontSize:13, fontWeight:700, marginBottom:16 }}>Key Metrics</div>
            {[
              { label:'Total Clients',         value:companies.length,                    color:'var(--accent)' },
              { label:'Active',                value:active.length,                       color:'var(--success)' },
              { label:'Trial',                 value:trial.length,                        color:'var(--warning)' },
              { label:'Suspended',             value:inactive.length,                     color:'var(--danger)' },
              { label:'Total Rooms',           value:stats?.total_rooms||0,               color:'#3b82f6' },
              { label:'Total Residents',       value:stats?.total_residents||0,           color:'#8b5cf6' },
              { label:'Occupancy Rate',        value:`${occupancyPct}%`,                  color: occupancyPct>=70?'var(--success)':'var(--warning)' },
              { label:'Open Complaints',       value:stats?.open_complaints||0,           color:'var(--warning)' },
              { label:'MRR',                   value:`₹${mrr.toLocaleString()}`,          color:'var(--success)' },
              { label:'ARR',                   value:`₹${(mrr*12/100000).toFixed(1)}L`,  color:'#FF6B35' },
            ].map(m => (
              <div key={m.label} style={{ display:'flex', justifyContent:'space-between', padding:'7px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
                <span style={{ color:'var(--text-2)' }}>{m.label}</span>
                <span style={{ fontWeight:700, color:m.color }}>{m.value}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── PROVISION MODAL (multi-step) ── */}
      {provModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && (setProvModal(false), setProvStep(1))}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:660 }}>
            {/* Header */}
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:18, fontWeight:800 }}>Provision New Client</div>
                <div style={{ fontSize:12, color:'var(--text-3)', marginTop:4 }}>
                  Creates login credentials + isolated database for the owner
                </div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => { setProvModal(false); setProvStep(1); }}>✕</button>
            </div>

            {/* Step indicator */}
            <div style={{ display:'flex', gap:0, marginBottom:22, borderRadius:8, overflow:'hidden', border:'1px solid var(--border)' }}>
              {[['1','Identity'],['2','Property'],['3','Billing'],['4','Options']].map(([n, lbl]) => (
                <div key={n} onClick={() => provStep >= parseInt(n) && setProvStep(parseInt(n))}
                  style={{
                    flex:1, padding:'8px 12px', textAlign:'center', fontSize:12, fontWeight:700,
                    background: parseInt(n) === provStep ? 'var(--accent)' : parseInt(n) < provStep ? `${PLAN_COLOR['basic']}18` : 'var(--bg-hover)',
                    color: parseInt(n) === provStep ? '#fff' : parseInt(n) < provStep ? '#22c55e' : 'var(--text-3)',
                    cursor: provStep >= parseInt(n) ? 'pointer' : 'default',
                    borderRight: n !== '4' ? '1px solid var(--border)' : 'none',
                    transition:'all 0.15s',
                  }}>
                  {parseInt(n) < provStep ? '✓ ' : `${n}. `}{lbl}
                </div>
              ))}
            </div>

            {provErr && <div className="alert alert-error" style={{ marginBottom:16 }}>{provErr}</div>}

            <form onSubmit={provision}>
              {/* STEP 1 — Identity */}
              {provStep === 1 && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div className="form-group">
                    <label className="form-label">Owner Full Name *</label>
                    <input name="owner_name" value={pForm.owner_name} onChange={pHandle} className="form-input" placeholder="Ravi Shankar" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Phone *</label>
                    <input name="phone" value={pForm.phone} onChange={pHandle} className="form-input" placeholder="9811000001" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Login Email *</label>
                    <input name="owner_email" type="email" value={pForm.owner_email} onChange={pHandle} className="form-input" placeholder="ravi@sunrise.com" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Temporary Password *</label>
                    <input name="owner_password" type="text" value={pForm.owner_password} onChange={pHandle} className="form-input" placeholder="TempPass@123" required />
                  </div>
                  <div className="form-group" style={{ gridColumn:'1/-1' }}>
                    <label className="form-label">Company / Property Name *</label>
                    <input name="company_name" value={pForm.company_name} onChange={pHandle} className="form-input" placeholder="Sunrise Homes PG" required />
                  </div>
                </div>
              )}

              {/* STEP 2 — Property */}
              {provStep === 2 && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div className="form-group" style={{ gridColumn:'1/-1' }}>
                    <label className="form-label">Property Type</label>
                    <div style={{ display:'grid', gridTemplateColumns:'repeat(5,1fr)', gap:8, marginTop:6 }}>
                      {[['pg','🏠','PG'],['hostel','🏨','Hostel'],['lodge','🛏️','Lodge'],['dormitory','🏫','Dorm'],['apartment','🏢','Apartment']].map(([v,ic,lb]) => (
                        <div key={v} onClick={() => setPForm(f=>({...f,property_type:v}))}
                          style={{
                            padding:'10px 6px', borderRadius:10, cursor:'pointer', textAlign:'center',
                            border:`1.5px solid ${pForm.property_type===v ? 'var(--accent)' : 'var(--border)'}`,
                            background: pForm.property_type===v ? 'var(--accent)15' : 'var(--bg-hover)',
                          }}>
                          <div style={{ fontSize:18 }}>{ic}</div>
                          <div style={{ fontSize:10, fontWeight:700, marginTop:3, color: pForm.property_type===v ? 'var(--accent)' : 'var(--text-2)' }}>{lb}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">City *</label>
                    <input name="city" value={pForm.city} onChange={pHandle} className="form-input" placeholder="Bangalore" required />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Full Address</label>
                    <input name="address" value={pForm.address} onChange={pHandle} className="form-input" placeholder="123 MG Road, Bangalore" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Total Rooms</label>
                    <input name="total_rooms" type="number" value={pForm.total_rooms} onChange={pHandle} className="form-input" placeholder="30" min={0} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Number of Floors</label>
                    <input name="floors_count" type="number" value={pForm.floors_count} onChange={pHandle} className="form-input" placeholder="3" min={1} />
                  </div>
                  <div className="form-group">
                    <label className="form-label">Website (optional)</label>
                    <input name="website" value={pForm.website} onChange={pHandle} className="form-input" placeholder="https://sunrisepg.com" />
                  </div>
                  <div className="form-group">
                    <label className="form-label">GST Number (optional)</label>
                    <input name="gst_number" value={pForm.gst_number} onChange={pHandle} className="form-input" placeholder="29ABCDE1234F1Z5" />
                  </div>
                </div>
              )}

              {/* STEP 3 — Billing */}
              {provStep === 3 && (
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                  <div className="form-group" style={{ gridColumn:'1/-1' }}>
                    <label className="form-label">Subscription Plan</label>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:6 }}>
                      {[
                        ['basic','Basic','₹2,999/mo','Up to 50 rooms, core features'],
                        ['premium','Premium','₹4,999/mo','Up to 200 rooms, analytics, reports'],
                        ['enterprise','Enterprise','₹7,999/mo','Unlimited rooms, priority support'],
                      ].map(([key,label,price,desc]) => (
                        <div key={key} onClick={() => setPForm(f=>({...f,plan:key}))} style={{
                          padding:'14px 12px', borderRadius:10, cursor:'pointer',
                          border:`2px solid ${pForm.plan===key ? PLAN_COLOR[key] : 'var(--border)'}`,
                          background: pForm.plan===key ? `${PLAN_COLOR[key]}12` : 'var(--bg-input)',
                        }}>
                          <div style={{ fontWeight:800, fontSize:13, color: pForm.plan===key ? PLAN_COLOR[key] : 'var(--text-1)' }}>{label}</div>
                          <div style={{ fontSize:15, fontWeight:900, color: PLAN_COLOR[key], margin:'6px 0 4px' }}>{price}</div>
                          <div style={{ fontSize:10, color:'var(--text-3)', lineHeight:1.4 }}>{desc}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Initial Status</label>
                    <select name="status" value={pForm.status} onChange={pHandle} className="form-input">
                      <option value="trial">Trial (14-day free)</option>
                      <option value="active">Active / Paid immediately</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Contract Duration</label>
                    <select name="contract_months" value={pForm.contract_months} onChange={pHandle} className="form-input">
                      <option value="1">Month-to-month</option>
                      <option value="3">3 months</option>
                      <option value="6">6 months</option>
                      <option value="12">12 months (annual)</option>
                      <option value="24">24 months</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">Billing Cycle Day</label>
                    <select name="billing_cycle_day" value={pForm.billing_cycle_day} onChange={pHandle} className="form-input">
                      {[1,5,10,15,20,25].map(d => <option key={d} value={d}>Day {d} of month</option>)}
                    </select>
                  </div>
                  <div className="form-group" style={{ gridColumn:'1/-1', padding:'12px 14px', background:`${PLAN_COLOR[pForm.plan]||'var(--accent)'}0a`, borderRadius:10, border:`1px solid ${PLAN_COLOR[pForm.plan]||'var(--accent)'}30` }}>
                    <div style={{ fontSize:12, color:'var(--text-2)' }}>
                      <strong style={{ color: PLAN_COLOR[pForm.plan] }}>Billing summary:</strong>{' '}
                      {pForm.plan?.charAt(0).toUpperCase()+pForm.plan?.slice(1)} plan at <strong>₹{({basic:2999,premium:4999,enterprise:7999}[pForm.plan]||2999).toLocaleString()}/month</strong>,
                      billed on day {pForm.billing_cycle_day} of each month.
                      {pForm.contract_months > 1 && ` ${pForm.contract_months}-month contract.`}
                    </div>
                  </div>
                </div>
              )}

              {/* STEP 4 — Options */}
              {provStep === 4 && (
                <div style={{ display:'flex', flexDirection:'column', gap:16 }}>
                  <div style={{ padding:'14px 16px', background:'var(--bg-hover)', borderRadius:10, border:'1px solid var(--border)' }}>
                    <div style={{ fontSize:12, fontWeight:700, marginBottom:10, color:'var(--text-1)' }}>Client Summary</div>
                    {[
                      ['Company',  pForm.company_name],
                      ['Owner',    `${pForm.owner_name} — ${pForm.owner_email}`],
                      ['Location', `${pForm.city}${pForm.address ? ', '+pForm.address : ''}`],
                      ['Property', `${pForm.property_type} · ${pForm.total_rooms||0} rooms · ${pForm.floors_count} floor(s)`],
                      ['Plan',     `${pForm.plan?.toUpperCase()} — ₹${({basic:2999,premium:4999,enterprise:7999}[pForm.plan]||2999).toLocaleString()}/mo`],
                      ['Contract', `${pForm.contract_months} months · Bill on day ${pForm.billing_cycle_day}`],
                    ].map(([l,v]) => (
                      <div key={l} style={{ display:'flex', gap:8, padding:'4px 0', borderBottom:'1px solid var(--border)', fontSize:12 }}>
                        <span style={{ color:'var(--text-3)', minWidth:70 }}>{l}</span>
                        <span style={{ fontWeight:600 }}>{v}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <label className="form-label">Onboarding Notes (internal)</label>
                    <textarea name="onboarding_notes" value={pForm.onboarding_notes} onChange={pHandle}
                      className="form-input" rows={3} placeholder="E.g. Referred by X, interested in advanced payroll, prefers WhatsApp contact…"
                      style={{ resize:'vertical' }} />
                  </div>
                  <label style={{ display:'flex', alignItems:'center', gap:10, cursor:'pointer', padding:'12px 14px', border:'1px solid var(--border)', borderRadius:8, background:'var(--bg-hover)' }}>
                    <input type="checkbox" checked={pForm.send_welcome_email}
                      onChange={e => setPForm(f=>({...f,send_welcome_email:e.target.checked}))}
                      style={{ width:16, height:16, accentColor:'var(--accent)' }} />
                    <div>
                      <div style={{ fontSize:13, fontWeight:700 }}>Send welcome email</div>
                      <div style={{ fontSize:11, color:'var(--text-3)' }}>Email login credentials and plan details to the owner (logged to console)</div>
                    </div>
                  </label>
                </div>
              )}

              <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'space-between', alignItems:'center' }}>
                <div style={{ fontSize:12, color:'var(--text-3)' }}>Step {provStep} of 4</div>
                <div style={{ display:'flex', gap:10 }}>
                  {provStep > 1 && <button type="button" className="btn btn-ghost" onClick={() => setProvStep(s=>s-1)}>← Back</button>}
                  <button type="button" className="btn btn-ghost" onClick={() => { setProvModal(false); setProvStep(1); }}>Cancel</button>
                  {provStep < 4
                    ? <button type="button" className="btn btn-primary"
                        onClick={() => {
                          if (provStep===1 && (!pForm.owner_name||!pForm.owner_email||!pForm.owner_password||!pForm.company_name)) { alert('Please fill all required fields.'); return; }
                          if (provStep===2 && !pForm.city) { alert('City is required.'); return; }
                          setProvStep(s=>s+1);
                        }}>
                        Next →
                      </button>
                    : <button type="submit" className="btn btn-primary" style={{ background:'linear-gradient(135deg,#22c55e,#16a34a)' }}>
                        🚀 Create Client
                      </button>
                  }
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── EDIT CLIENT MODAL ── */}
      {editModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setEditModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:600 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:17, fontWeight:800 }}>Edit — {editModal.company_name}</div>
                <div style={{ fontSize:12, color:'var(--text-3)', marginTop:3 }}>Subscription, contacts, branding</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setEditModal(null)}>✕</button>
            </div>
            {editErr && <div className="alert alert-error">{editErr}</div>}
            <form onSubmit={saveEdit}>
              <div style={{ marginBottom:16 }}>
                <label className="form-label">Plan</label>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:10, marginTop:6 }}>
                  {[['basic','Basic','₹2,999'],['premium','Premium','₹4,999'],['enterprise','Enterprise','₹7,999']].map(([key,label,price]) => (
                    <div key={key} onClick={() => setEForm(f=>({...f,plan:key}))} style={{
                      padding:'10px 12px', borderRadius:10, cursor:'pointer', textAlign:'center',
                      border:`2px solid ${eForm.plan===key ? PLAN_COLOR[key] : 'var(--border)'}`,
                      background: eForm.plan===key ? `${PLAN_COLOR[key]}12` : 'var(--bg-input)',
                    }}>
                      <div style={{ fontWeight:700, fontSize:12, color: eForm.plan===key ? PLAN_COLOR[key] : 'var(--text-1)' }}>{label}</div>
                      <div style={{ fontSize:12, fontWeight:800, marginTop:2 }}>{price}/mo</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                {[
                  { name:'company_name', label:'Company Name' },
                  { name:'pg_logo', label:'Logo Emoji', placeholder:'🏠' },
                  { name:'owner_name', label:'Owner Name' },
                  { name:'owner_email', label:'Owner Email', type:'email' },
                  { name:'phone', label:'Phone' },
                  { name:'city', label:'City' },
                  { name:'total_rooms', label:'Total Rooms', type:'number' },
                ].map(f => (
                  <div className="form-group" key={f.name}>
                    <label className="form-label">{f.label}</label>
                    <input name={f.name} type={f.type||'text'} value={eForm[f.name]||''} onChange={eHandle} className="form-input" placeholder={f.placeholder||''} />
                  </div>
                ))}
                <div className="form-group">
                  <label className="form-label">Status</label>
                  <select name="status" value={eForm.status} onChange={eHandle} className="form-input">
                    <option value="trial">Trial</option>
                    <option value="active">Active</option>
                    <option value="inactive">Suspended</option>
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Tagline</label>
                  <input name="pg_tagline" value={eForm.pg_tagline||''} onChange={eHandle} className="form-input" placeholder="Your home away from home…" />
                </div>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:16, justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setEditModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Changes</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── RESET PASSWORD MODAL ── */}
      {pwModal && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setPwModal(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:420 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <div>
                <div style={{ fontSize:17, fontWeight:800 }}>Reset Password</div>
                <div style={{ fontSize:12, color:'var(--text-3)', marginTop:3 }}>{pwModal.owner_name} · {pwModal.owner_email}</div>
              </div>
              <button className="btn btn-ghost btn-sm" onClick={() => setPwModal(null)}>✕</button>
            </div>
            <form onSubmit={resetPassword}>
              <div className="form-group">
                <label className="form-label">New Temporary Password</label>
                <input type="text" value={newPw} onChange={e => setNewPw(e.target.value)}
                  className="form-input" placeholder="Min 6 characters" autoFocus />
              </div>
              <div style={{ padding:'10px 14px', background:'rgba(245,158,11,.07)', border:'1px solid rgba(245,158,11,.3)', borderRadius:8, fontSize:12, color:'var(--text-2)', marginBottom:14 }}>
                Owner's current password will be replaced immediately.
              </div>
              <div style={{ display:'flex', gap:10, justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setPwModal(null)}>Cancel</button>
                <button type="submit" className="btn btn-warning">Reset Password</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── DELETE CONFIRM ── */}
      {delConfirm && (
        <div className="modal-overlay" onClick={() => setDelConfirm(null)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:400, textAlign:'center' }}>
            <div style={{ fontSize:36, marginBottom:12 }}>⚠️</div>
            <div style={{ fontSize:17, fontWeight:800, marginBottom:8 }}>Delete Client?</div>
            <div style={{ fontSize:13, color:'var(--text-2)', marginBottom:20 }}>
              This will permanently delete <strong>{delConfirm.company_name}</strong>. This cannot be undone.
            </div>
            <div style={{ display:'flex', gap:10, justifyContent:'center' }}>
              <button className="btn btn-ghost" onClick={() => setDelConfirm(null)}>Cancel</button>
              <button className="btn btn-danger" onClick={() => deleteClient(delConfirm.id)}>Yes, Delete</button>
            </div>
          </div>
        </div>
      )}

      {/* ── CLIENT PROFILE DRAWER ── */}
      {profileClient && (
        <div className="modal-overlay" onClick={e => e.target===e.currentTarget && setProfileClient(null)}>
          <div onClick={e => e.stopPropagation()} style={{
            position:'fixed', right:0, top:0, bottom:0, width:'min(680px,96vw)',
            background:'var(--bg-card)', borderLeft:'1px solid var(--border)',
            display:'flex', flexDirection:'column', zIndex:1000, overflow:'hidden',
          }}>
            {/* Drawer header */}
            <div style={{
              padding:'20px 24px', borderBottom:'1px solid var(--border)',
              background:`linear-gradient(135deg,${PLAN_COLOR[profileClient.plan]||'var(--accent)'}12,transparent)`,
              flexShrink:0,
            }}>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                <div style={{ display:'flex', gap:14, alignItems:'center' }}>
                  <div style={{
                    width:48, height:48, borderRadius:12, overflow:'hidden', flexShrink:0,
                    background:`${PLAN_COLOR[profileClient.plan]}18`,
                    border:`2px solid ${PLAN_COLOR[profileClient.plan]}40`,
                    display:'flex', alignItems:'center', justifyContent:'center', fontSize:20,
                  }}>
                    {profileClient.pg_logo?.startsWith('data:')||profileClient.pg_logo?.startsWith('http')
                      ? <img src={profileClient.pg_logo} alt="" style={{ width:48, height:48, objectFit:'cover' }} />
                      : (profileClient.pg_logo||'🏢')}
                  </div>
                  <div>
                    <div style={{ fontSize:18, fontWeight:800 }}>{profileClient.company_name}</div>
                    <div style={{ fontSize:12, color:'var(--text-3)', marginTop:2 }}>
                      {profileClient.owner_name} · {profileClient.owner_email}
                    </div>
                    <div style={{ display:'flex', gap:8, marginTop:6 }}>
                      <span className={`badge ${PLAN_BADGE[profileClient.plan]||'badge-info'}`}>{profileClient.plan}</span>
                      <span style={{ fontSize:11, fontWeight:700, color:STATUS_DOT[profileClient.status], padding:'2px 8px', borderRadius:10, background:`${STATUS_DOT[profileClient.status]}18` }}>
                        {profileClient.status}
                      </span>
                      <span style={{ fontSize:11, color:'var(--text-3)' }}>📍 {profileClient.city}</span>
                    </div>
                  </div>
                </div>
                <button className="btn btn-ghost btn-sm" onClick={() => setProfileClient(null)}>✕</button>
              </div>

              {/* Quick action bar */}
              <div style={{ display:'flex', gap:8, marginTop:14, flexWrap:'wrap' }}>
                <button className="btn btn-ghost btn-xs" onClick={() => openEdit(profileClient)}>✏️ Edit</button>
                <button className="btn btn-ghost btn-xs" onClick={() => { setPwModal(profileClient); setNewPw(''); }}>🔑 Reset Password</button>
                {profileClient.status !== 'active'  && <button className="btn btn-success btn-xs" onClick={() => { changeStatus(profileClient.id,'active'); setProfileClient(c=>({...c,status:'active'})); }}>✅ Activate</button>}
                {profileClient.status === 'active'  && <button className="btn btn-danger  btn-xs" onClick={() => { changeStatus(profileClient.id,'inactive'); setProfileClient(c=>({...c,status:'inactive'})); }}>⛔ Suspend</button>}
                {profileClient.status === 'inactive'&& <button className="btn btn-danger  btn-xs" onClick={() => setDelConfirm(profileClient)}>🗑 Delete</button>}
                <button className="btn btn-warning btn-xs" onClick={sendReminder}>📧 Send Reminder</button>
              </div>
            </div>

            {/* Tabs */}
            <div style={{ display:'flex', borderBottom:'1px solid var(--border)', flexShrink:0 }}>
              {[['overview','Overview'],['billing','Billing'],['emails','Emails'],['details','Details']].map(([v,l]) => (
                <button key={v} onClick={() => setProfileTab(v)}
                  style={{
                    padding:'10px 18px', border:'none', background:'none', cursor:'pointer',
                    fontSize:13, fontWeight:700,
                    color: profileTab===v ? 'var(--accent)' : 'var(--text-3)',
                    borderBottom: profileTab===v ? '2px solid var(--accent)' : '2px solid transparent',
                    transition:'all 0.15s',
                  }}>{l}</button>
              ))}
            </div>

            {/* Tab content */}
            <div style={{ flex:1, overflow:'auto', padding:'20px 24px' }}>

              {/* OVERVIEW */}
              {profileTab === 'overview' && (
                <>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:12, marginBottom:20 }}>
                    {[
                      { label:'MRR',           value:`₹${profileClient.subscription_amount?.toLocaleString()}/mo`,  color:'var(--success)' },
                      { label:'Plan',           value: profileClient.plan?.toUpperCase(),                            color: PLAN_COLOR[profileClient.plan] },
                      { label:'Total Rooms',    value: profileClient.total_rooms,                                    color:'var(--accent)' },
                      { label:'Member Since',   value: profileClient.registered_at?.slice(0,10),                    color:'var(--text-2)' },
                    ].map(s => (
                      <div key={s.label} style={{ padding:'14px 16px', background:'var(--bg-hover)', borderRadius:10 }}>
                        <div style={{ fontSize:11, color:'var(--text-3)', textTransform:'uppercase', letterSpacing:0.5 }}>{s.label}</div>
                        <div style={{ fontSize:18, fontWeight:800, color:s.color, marginTop:4 }}>{s.value}</div>
                      </div>
                    ))}
                  </div>
                  {/* Plan changer */}
                  <div style={{ marginBottom:20 }}>
                    <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Change Plan</div>
                    <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8 }}>
                      {[['basic','Basic','₹2,999'],['premium','Premium','₹4,999'],['enterprise','Enterprise','₹7,999']].map(([key,label,price]) => (
                        <div key={key}
                          onClick={async () => {
                            if (profileClient.plan === key) return;
                            if (!window.confirm(`Change plan to ${label}? This will notify the owner.`)) return;
                            try {
                              const updated = await api.updateCompany(profileClient.id, { plan: key });
                              setProfileClient(updated);
                              load();
                            } catch(err) { alert(err.message); }
                          }}
                          style={{
                            padding:'12px 10px', borderRadius:10, cursor:'pointer', textAlign:'center',
                            border:`2px solid ${profileClient.plan===key ? PLAN_COLOR[key] : 'var(--border)'}`,
                            background: profileClient.plan===key ? `${PLAN_COLOR[key]}15` : 'var(--bg-hover)',
                            opacity: profileClient.plan===key ? 1 : 0.7,
                          }}>
                          <div style={{ fontWeight:800, fontSize:12, color: profileClient.plan===key ? PLAN_COLOR[key] : 'var(--text-2)' }}>{label}</div>
                          <div style={{ fontSize:13, fontWeight:900, color:PLAN_COLOR[key], marginTop:4 }}>{price}</div>
                          {profileClient.plan===key && <div style={{ fontSize:10, color:PLAN_COLOR[key], marginTop:2 }}>Current</div>}
                        </div>
                      ))}
                    </div>
                  </div>
                  {/* Billing stats */}
                  {!billingLoading && billing.length > 0 && (
                    <div style={{ padding:'12px 14px', background:'var(--bg-hover)', borderRadius:10 }}>
                      <div style={{ fontSize:12, fontWeight:700, marginBottom:8 }}>Billing Snapshot</div>
                      <div style={{ display:'flex', gap:20, fontSize:12 }}>
                        <span>Total invoices: <strong>{billing.length}</strong></span>
                        <span style={{ color:'var(--success)' }}>Paid: <strong>{billing.filter(b=>b.status==='paid').length}</strong></span>
                        <span style={{ color:'var(--warning)' }}>Pending: <strong>{billing.filter(b=>b.status==='pending').length}</strong></span>
                      </div>
                    </div>
                  )}
                </>
              )}

              {/* BILLING */}
              {profileTab === 'billing' && (
                <>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:16 }}>
                    <div style={{ fontSize:14, fontWeight:700 }}>Subscription Invoices</div>
                    <button className="btn btn-primary btn-sm" onClick={generateInvoice}>+ Generate Invoice</button>
                  </div>
                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:8, marginBottom:12 }}>
                    <input type="number" placeholder="Month (1-12)" value={newBill.month}
                      onChange={e=>setNewBill(b=>({...b,month:e.target.value}))}
                      className="form-input" style={{ fontSize:12 }} min={1} max={12} />
                    <input type="number" placeholder="Year" value={newBill.year}
                      onChange={e=>setNewBill(b=>({...b,year:e.target.value}))}
                      className="form-input" style={{ fontSize:12 }} min={2024} />
                    <input placeholder="Notes (optional)" value={newBill.notes}
                      onChange={e=>setNewBill(b=>({...b,notes:e.target.value}))}
                      className="form-input" style={{ fontSize:12 }} />
                  </div>
                  {billingLoading ? <div style={{ textAlign:'center', padding:30, color:'var(--text-3)' }}>Loading…</div> : (
                    billing.length === 0
                      ? <div style={{ textAlign:'center', padding:40, color:'var(--text-3)' }}>No billing records yet. Generate the first invoice above.</div>
                      : billing.map(b => (
                        <div key={b.id} style={{
                          padding:'14px 16px', borderRadius:10, marginBottom:8,
                          background: b.status==='paid' ? 'rgba(34,197,94,0.05)' : 'rgba(245,158,11,0.05)',
                          border:`1px solid ${b.status==='paid' ? 'rgba(34,197,94,0.2)' : 'rgba(245,158,11,0.2)'}`,
                          display:'flex', justifyContent:'space-between', alignItems:'center', gap:10,
                        }}>
                          <div>
                            <div style={{ fontWeight:700, fontSize:13 }}>{b.invoice_number}</div>
                            <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>
                              Period: {String(b.period_month).padStart(2,'0')}/{b.period_year} · Due: {b.due_date||'—'}
                            </div>
                            {b.notes && <div style={{ fontSize:11, color:'var(--text-3)', marginTop:1 }}>{b.notes}</div>}
                          </div>
                          <div style={{ textAlign:'right', flexShrink:0 }}>
                            <div style={{ fontWeight:800, fontSize:16, color: b.status==='paid' ? 'var(--success)' : 'var(--warning)' }}>
                              ₹{b.amount?.toLocaleString()}
                            </div>
                            <div style={{ fontSize:11, fontWeight:700, marginTop:3, textTransform:'uppercase', color: b.status==='paid' ? 'var(--success)' : 'var(--warning)' }}>
                              {b.status}
                            </div>
                            {b.paid_date && <div style={{ fontSize:10, color:'var(--text-3)' }}>Paid: {b.paid_date}</div>}
                          </div>
                          {b.status !== 'paid' && (
                            <button className="btn btn-success btn-xs" onClick={() => markBillingPaid(b.id)}>Mark Paid</button>
                          )}
                        </div>
                      ))
                  )}
                </>
              )}

              {/* EMAILS */}
              {profileTab === 'emails' && (
                <>
                  <div style={{ marginBottom:16 }}>
                    <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Send Email to Owner</div>
                    <input placeholder="Subject" value={emailForm.subject}
                      onChange={e=>setEmailForm(f=>({...f,subject:e.target.value}))}
                      className="form-input" style={{ marginBottom:8 }} />
                    <textarea placeholder="Email body…" value={emailForm.body}
                      onChange={e=>setEmailForm(f=>({...f,body:e.target.value}))}
                      className="form-input" rows={4} style={{ resize:'vertical', marginBottom:8 }} />
                    <div style={{ display:'flex', gap:8 }}>
                      <button className="btn btn-primary btn-sm" disabled={emailSending||!emailForm.subject||!emailForm.body}
                        onClick={sendEmail}>{emailSending ? 'Sending…' : '📧 Send Email'}</button>
                      <button className="btn btn-warning btn-sm" onClick={sendReminder}>📬 Send Payment Reminder</button>
                    </div>
                  </div>
                  <div style={{ fontSize:13, fontWeight:700, marginBottom:10 }}>Email History</div>
                  {clientEmails.length === 0
                    ? <div style={{ textAlign:'center', padding:30, color:'var(--text-3)' }}>No emails sent yet.</div>
                    : clientEmails.map(e => (
                      <div key={e.id} style={{
                        padding:'12px 14px', borderRadius:10, marginBottom:8,
                        background:'var(--bg-hover)', border:'1px solid var(--border)',
                      }}>
                        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
                          <div style={{ fontWeight:700, fontSize:13 }}>{e.subject}</div>
                          <div style={{ fontSize:10, color:'var(--text-3)', flexShrink:0, marginLeft:10 }}>{e.created_at?.slice(0,16)}</div>
                        </div>
                        <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>To: {e.to_email} · {e.email_type}</div>
                        <div style={{ fontSize:12, color:'var(--text-2)', marginTop:6, whiteSpace:'pre-line', maxHeight:80, overflow:'hidden' }}>{e.body}</div>
                      </div>
                    ))
                  }
                </>
              )}

              {/* DETAILS */}
              {profileTab === 'details' && (
                <div style={{ display:'flex', flexDirection:'column', gap:8 }}>
                  {[
                    ['Company ID',      `#${profileClient.id}`],
                    ['Property Type',   profileClient.property_type],
                    ['Website',         profileClient.website||'—'],
                    ['GST Number',      profileClient.gst_number||'—'],
                    ['Floors',          profileClient.floors_count||'—'],
                    ['Contract',        profileClient.contract_months ? `${profileClient.contract_months} months` : '—'],
                    ['Billing Day',     profileClient.billing_cycle_day ? `Day ${profileClient.billing_cycle_day}` : '—'],
                    ['Next Due',        profileClient.next_due_date||'—'],
                    ['Contact Email',   profileClient.contact_email||profileClient.owner_email],
                    ['Contact Phone',   profileClient.contact_phone||profileClient.phone||'—'],
                    ['Address',         profileClient.address||'—'],
                    ['Registered',      profileClient.registered_at?.slice(0,16)],
                    ['Onboarding Notes',profileClient.onboarding_notes||'—'],
                  ].map(([l,v]) => (
                    <div key={l} style={{ display:'flex', gap:10, padding:'8px 12px', borderRadius:8, background:'var(--bg-hover)', fontSize:13 }}>
                      <span style={{ color:'var(--text-3)', minWidth:130, flexShrink:0 }}>{l}</span>
                      <span style={{ fontWeight:600, wordBreak:'break-all' }}>{v}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   OWNER DASHBOARD
   ══════════════════════════════════════════════════════════════════ */
function OwnerDashboard() {
  const [stats,  setStats]  = useState(null);
  const [rooms,  setRooms]  = useState([]);
  const [rev,    setRev]    = useState([]);
  const [loading,setLoading]= useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    Promise.all([api.dashboardStats(), api.roomStatusChart(), api.revenueTrend()])
      .then(([s, r, rv]) => { setStats(s); setRooms(r); setRev(rv); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner-wrap"><div className="spinner" /><span>Loading…</span></div>;

  const occupancyPct = stats?.total_rooms ? Math.round(stats.occupied_rooms / stats.total_rooms * 100) : 0;

  return (
    <>
      {/* KPIs */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:14, marginBottom:24 }}>
        {[
          { icon:'👥', label:'Residents',       value:stats?.total_residents||0,      sub:'Active customers',      color:'var(--accent)',   to:'/residents' },
          { icon:'💰', label:'Revenue / Month', value:`₹${(stats?.monthly_revenue||0).toLocaleString()}`,sub:'Collected this month',color:'var(--success)',to:'/payments' },
          { icon:'⏰', label:'Pending Payments',value:stats?.pending_payments||0,     sub:'Need collection',       color:'var(--warning)', to:'/payments' },
          { icon:'📢', label:'Open Complaints', value:stats?.pending_complaints||0,   sub:'Need attention',        color:'var(--danger)',   to:'/complaints' },
        ].map(s => (
          <div key={s.label} className="stat-card" style={{ cursor:'pointer' }} onClick={() => s.to && navigate(s.to)}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div className="stat-label">{s.label}</div>
                <div className="stat-value" style={{ color:s.color }}>{s.value}</div>
                <div className="stat-sub">{s.sub}</div>
              </div>
              <div style={{ fontSize:26, opacity:0.6 }}>{s.icon}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Occupancy bar */}
      <div className="card" style={{ padding:'18px 24px', marginBottom:24 }}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:12 }}>
          <div style={{ fontSize:14, fontWeight:700, color:'var(--text-1)' }}>Room Occupancy</div>
          <div style={{ display:'flex', gap:20, fontSize:12 }}>
            <span style={{ color:'var(--success)' }}>✅ {stats?.vacant_rooms||0} vacant</span>
            <span style={{ color:'var(--danger)' }}>🔴 {stats?.occupied_rooms||0} occupied</span>
            <span style={{ color:'var(--warning)' }}>🔧 {stats?.maintenance_rooms||0} maintenance</span>
          </div>
        </div>
        <div style={{ height:10, background:'var(--bg-hover)', borderRadius:5, overflow:'hidden' }}>
          <div style={{ height:'100%', width:`${occupancyPct}%`, background:'linear-gradient(90deg,var(--accent),#ff9a6c)', borderRadius:5, transition:'width 0.6s' }} />
        </div>
        <div style={{ display:'flex', justifyContent:'space-between', marginTop:8, fontSize:12, color:'var(--text-3)' }}>
          <span>{occupancyPct}% occupied</span>
          <span>{stats?.total_rooms||0} total rooms</span>
        </div>
      </div>

      {/* Charts */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 2fr', gap:16, marginBottom:24 }}>
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:16 }}>Room Status</div>
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={rooms} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={55} outerRadius={80}
                label={({ name, value }) => value > 0 ? `${value}` : null}>
                {rooms.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ fontSize:12, color:'var(--text-2)' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:16 }}>Revenue — Last 6 Months</div>
          <ResponsiveContainer width="100%" height={200}>
            <AreaChart data={rev}>
              <defs>
                <linearGradient id="revGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="var(--accent)" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="var(--accent)" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" tick={{ fill:'var(--text-2)', fontSize:11 }} />
              <YAxis tick={{ fill:'var(--text-2)', fontSize:11 }} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => `₹${v.toLocaleString()}`} contentStyle={TT} />
              <Area type="monotone" dataKey="revenue" stroke="var(--accent)" strokeWidth={2}
                fill="url(#revGrad)" name="Revenue" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Tables */}
      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
        <div className="card" style={{ padding:0 }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>Recent Customers</div>
            <button className="btn btn-ghost btn-xs" onClick={() => navigate('/residents')}>View all →</button>
          </div>
          <table className="pg-table">
            <thead><tr><th>Name</th><th>Room</th><th>Move-in</th></tr></thead>
            <tbody>
              {(stats?.recent_registrations || []).map((r, i) => (
                <tr key={i}>
                  <td>
                    <div style={{ display:'flex', alignItems:'center', gap:8 }}>
                      <div className="avatar" style={{ width:28, height:28, fontSize:11 }}>{r.name?.charAt(0)}</div>
                      <span style={{ fontWeight:600, fontSize:13 }}>{r.name}</span>
                    </div>
                  </td>
                  <td style={{ fontWeight:700, color:'var(--accent)' }}>{r.room_number || '—'}</td>
                  <td style={{ color:'var(--text-3)', fontSize:12 }}>{r.move_in_date}</td>
                </tr>
              ))}
              {!(stats?.recent_registrations?.length) && (
                <tr><td colSpan={3} style={{ textAlign:'center', padding:30, color:'var(--text-3)' }}>No residents yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="card" style={{ padding:0 }}>
          <div style={{ padding:'14px 20px', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <div style={{ fontSize:13, fontWeight:700, color:'var(--text-1)' }}>Pending Payments</div>
            <button className="btn btn-ghost btn-xs" onClick={() => navigate('/payments')}>View all →</button>
          </div>
          <table className="pg-table">
            <thead><tr><th>Resident</th><th>Room</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>
              {(stats?.pending_payments_list || []).slice(0, 5).map((p, i) => (
                <tr key={i}>
                  <td style={{ fontWeight:600, fontSize:13 }}>{p.resident_name}</td>
                  <td style={{ color:'var(--text-2)' }}>{p.room_number || '—'}</td>
                  <td style={{ fontWeight:700, color:'var(--accent)' }}>₹{p.amount?.toLocaleString()}</td>
                  <td><span className={`badge badge-${p.status}`} style={{ textTransform:'capitalize' }}>{p.status}</span></td>
                </tr>
              ))}
              {!(stats?.pending_payments_list?.length) && (
                <tr><td colSpan={4} style={{ textAlign:'center', padding:30, color:'var(--success)' }}>All payments collected!</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </>
  );
}

/* ══════════════════════════════════════════════════════════════════
   CUSTOMER (RESIDENT) DASHBOARD
   ══════════════════════════════════════════════════════════════════ */
function ResidentDashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile,    setProfile]    = useState(null);
  const [payments,   setPayments]   = useState([]);
  const [complaints, setComplaints] = useState([]);
  const [notices,    setNotices]    = useState([]);
  const [menu,       setMenu]       = useState(null);
  const [loading,    setLoading]    = useState(true);

  useEffect(() => {
    Promise.all([
      api.getMyProfile().catch(() => null),
      api.getPayments().catch(() => []),
      api.getComplaints().catch(() => []),
      api.getNotices().catch(() => []),
      api.getTodayMenu().catch(() => null),
    ]).then(([p, pay, comp, nts, m]) => {
      setProfile(p); setPayments(pay); setComplaints(comp); setNotices(nts); setMenu(m);
    }).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner-wrap"><div className="spinner" /><span>Loading…</span></div>;

  const latestPay = payments.find(p => p.status !== 'paid') || payments[0];
  const MEAL_COLOR = { Breakfast:'#3b82f6', Lunch:'#22c55e', Dinner:'#8b5cf6' };

  return (
    <>
      {/* Welcome card */}
      <div className="card" style={{ padding:'22px 24px', marginBottom:20, borderLeft:'4px solid var(--accent)' }}>
        <div style={{ display:'flex', alignItems:'center', gap:18, flexWrap:'wrap' }}>
          <div className="avatar" style={{ width:54, height:54, fontSize:22, flexShrink:0 }}>
            {user?.name?.charAt(0)}
          </div>
          <div style={{ flex:1, minWidth:200 }}>
            <div style={{ fontSize:20, fontWeight:800, color:'var(--text-1)', marginBottom:6 }}>
              Hey {user?.name?.split(' ')[0]}! 👋
            </div>
            {profile ? (
              <div style={{ display:'flex', flexWrap:'wrap', gap:'6px 24px' }}>
                {[
                  { label:'Room',  value:`${profile.room_number || 'Not assigned'} · Floor ${profile.floor}` },
                  { label:'Type',  value:profile.room_type },
                  { label:'Rent',  value:`₹${profile.rent_amount?.toLocaleString()}/mo` },
                  { label:'Since', value:profile.move_in_date || '—' },
                ].map(item => (
                  <div key={item.label} style={{ fontSize:13, color:'var(--text-2)' }}>
                    <span style={{ color:'var(--text-3)' }}>{item.label}: </span>
                    <span style={{ fontWeight:600, color:'var(--text-1)' }}>{item.value}</span>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ color:'var(--warning)', fontSize:13 }}>No active room assigned yet. Contact your property manager.</div>
            )}
          </div>
          {latestPay && (
            <div style={{ textAlign:'right', flexShrink:0 }}>
              <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:4 }}>Rent Status</div>
              <div style={{ fontSize:24, fontWeight:900, color: latestPay.status === 'paid' ? 'var(--success)' : 'var(--warning)' }}>
                ₹{latestPay.amount?.toLocaleString()}
              </div>
              <span className={`badge badge-${latestPay.status}`} style={{ textTransform:'capitalize' }}>{latestPay.status}</span>
              {latestPay.status !== 'paid' && (
                <div style={{ marginTop:8 }}>
                  <button className="btn btn-primary btn-sm" onClick={() => navigate('/payments')}>Pay Now →</button>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr 1fr', gap:16 }}>
        {/* Today's menu */}
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:14, display:'flex', alignItems:'center', gap:8 }}>
            <span>🍽️</span> Today's Mess
            {menu?.day && <span style={{ fontSize:11, color:'var(--text-3)', fontWeight:400 }}>— {menu.day}</span>}
          </div>
          {(menu?.menu || []).length === 0
            ? <div style={{ color:'var(--text-3)', fontSize:13, padding:'20px 0', textAlign:'center' }}>No menu posted today.</div>
            : (menu.menu).map((m, i) => (
              <div key={i} style={{ padding:'10px 0', borderBottom:'1px solid var(--border)' }}>
                <div style={{ fontSize:11, fontWeight:700, color: MEAL_COLOR[m.meal_type] || 'var(--accent)', textTransform:'uppercase', letterSpacing:0.5 }}>
                  {m.meal_type} · {m.timing}
                </div>
                <div style={{ fontSize:13, color:'var(--text-1)', lineHeight:1.5, marginTop:3 }}>{m.items}</div>
                {m.special_note && <div style={{ fontSize:11, color:'var(--accent)', marginTop:4 }}>⭐ {m.special_note}</div>}
              </div>
            ))}
        </div>

        {/* My complaints */}
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:14, display:'flex', justifyContent:'space-between', alignItems:'center' }}>
            <span>📢 My Complaints</span>
            <button className="btn btn-ghost btn-xs" onClick={() => navigate('/complaints')}>+ New</button>
          </div>
          {complaints.length === 0
            ? <div style={{ color:'var(--text-3)', fontSize:13, padding:'20px 0', textAlign:'center' }}>No complaints raised.</div>
            : complaints.slice(0, 4).map((c, i) => (
              <div key={i} style={{ padding:'8px 0', borderBottom:'1px solid var(--border)', display:'flex', justifyContent:'space-between', alignItems:'flex-start', gap:8 }}>
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontSize:11, fontWeight:700, color:'var(--accent)', textTransform:'uppercase' }}>{c.category}</div>
                  <div style={{ fontSize:12, color:'var(--text-2)', marginTop:2, overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>
                    {c.description}
                  </div>
                </div>
                <span className={`badge badge-${c.status?.replace(' ','-')}`} style={{ flexShrink:0, textTransform:'capitalize' }}>{c.status}</span>
              </div>
            ))}
        </div>

        {/* Notices */}
        <div className="card" style={{ padding:20 }}>
          <div style={{ fontSize:13, fontWeight:700, color:'var(--text-1)', marginBottom:14 }}>📌 Notices</div>
          {notices.length === 0
            ? <div style={{ color:'var(--text-3)', fontSize:13, padding:'20px 0', textAlign:'center' }}>No notices posted.</div>
            : notices.slice(0, 5).map((n, i) => (
              <div key={i} style={{ padding:'9px 0', borderBottom:'1px solid var(--border)', display:'flex', gap:10, alignItems:'flex-start' }}>
                <div style={{ width:6, height:6, borderRadius:'50%', background: n.is_important ? 'var(--danger)' : 'var(--accent)', flexShrink:0, marginTop:5 }} />
                <div style={{ flex:1, minWidth:0 }}>
                  <div style={{ fontWeight:600, fontSize:13, color:'var(--text-1)', overflow:'hidden', textOverflow:'ellipsis', whiteSpace:'nowrap' }}>{n.title}</div>
                  <div style={{ fontSize:11, color:'var(--text-3)', marginTop:2 }}>{n.content?.slice(0,60)}{n.content?.length>60?'…':''}</div>
                </div>
                {!n.is_read && <div style={{ width:7, height:7, borderRadius:'50%', background:'var(--accent)', flexShrink:0, marginTop:4 }} />}
              </div>
            ))}
        </div>
      </div>
    </>
  );
}

export default function Dashboard() {
  const { user } = useAuth();
  if (!user) return null;
  if (user.role === 'super_admin') return <PlatformDashboard />;
  if (user.role === 'owner')       return <OwnerDashboard />;
  return <ResidentDashboard />;
}
