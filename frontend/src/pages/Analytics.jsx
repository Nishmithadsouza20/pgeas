import React, { useEffect, useState } from 'react';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, CartesianGrid,
  AreaChart, Area,
} from 'recharts';
import { api } from '../utils/api';
import { useAuth } from '../context/AuthContext';

const COLORS = ['#FF6B35','#22c55e','#3b82f6','#f59e0b','#8b5cf6','#ec4899'];
const TT = { background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-1)', borderRadius:8, fontSize:12 };
const AX = { tick:{ fill:'var(--text-3)', fontSize:11 } };

function ChartCard({ title, sub, children }) {
  return (
    <div className="card" style={{ padding:20 }}>
      <div style={{ fontWeight:700, color:'var(--text-1)', fontSize:14 }}>{title}</div>
      {sub && <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:14 }}>{sub}</div>}
      {!sub && <div style={{ marginBottom:16 }} />}
      {children}
    </div>
  );
}

/* ── Platform analytics for super_admin ── */
function PlatformAnalytics() {
  const [stats,    setStats]    = useState(null);
  const [activity, setActivity] = useState({ mrr_trend:[], recent_clients:[] });
  const [companies,setCompanies]= useState([]);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      api.get('/companies/stats'),
      api.get('/companies/stats/activity'),
      api.get('/companies/'),
    ]).then(([s, a, c]) => { setStats(s); setActivity(a); setCompanies(c); })
      .catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner-wrap"><div className="spinner" /><span>Loading analytics…</span></div>;

  const active   = companies.filter(c => c.status === 'active');
  const mrr      = active.reduce((s, c) => s + c.subscription_amount, 0);
  const byPlan   = ['basic','premium','enterprise'].map(p => ({
    name: p.charAt(0).toUpperCase()+p.slice(1),
    value: companies.filter(c => c.plan === p).length,
  })).filter(d => d.value > 0);
  const occupancyPct = stats?.total_rooms ? Math.round(stats.occupied_rooms / stats.total_rooms * 100) : 0;

  // Monthly new signups
  const monthlySigns = (() => {
    const map = {};
    companies.forEach(c => {
      const mo = c.registered_at?.slice(0,7);
      if (mo) map[mo] = (map[mo]||0)+1;
    });
    return Object.entries(map).sort(([a],[b])=>a.localeCompare(b)).slice(-6).map(([k,v]) => ({
      month: new Date(k+'-01').toLocaleDateString('en-IN',{month:'short',year:'numeric'}),
      signups: v,
    }));
  })();

  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Clients',  value: companies.length,                   icon:'🏢', color:'var(--accent)' },
          { label:'MRR',            value:`₹${(mrr/1000).toFixed(1)}k`,        icon:'💰', color:'var(--success)' },
          { label:'ARR',            value:`₹${(mrr*12/100000).toFixed(1)}L`,   icon:'📈', color:'#FF6B35' },
          { label:'Occupancy',      value:`${occupancyPct}%`,                  icon:'🏠', color:'#8b5cf6' },
        ].map(k => (
          <div key={k.label} className="stat-card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div className="stat-label">{k.label}</div>
                <div className="stat-value" style={{ color:k.color }}>{k.value}</div>
              </div>
              <span style={{ fontSize:26, opacity:0.65 }}>{k.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:16, marginBottom:16 }}>
        <ChartCard title="MRR Growth — Last 6 Months" sub="Cumulative active subscription revenue">
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={activity.mrr_trend||[]}>
              <defs>
                <linearGradient id="mrrGp" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#FF6B35" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#FF6B35" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" {...AX} />
              <YAxis {...AX} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => `₹${v.toLocaleString()}`} contentStyle={TT} />
              <Area type="monotone" dataKey="mrr" stroke="#FF6B35" strokeWidth={2.5} fill="url(#mrrGp)" name="MRR" />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Plan Distribution" sub="">
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={byPlan} dataKey="value" nameKey="name" cx="50%" cy="50%"
                outerRadius={80} label={({ name, value }) => `${name} (${value})`} labelLine={false}>
                {byPlan.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ color:'var(--text-2)', fontSize:12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <ChartCard title="Monthly New Signups" sub="Clients registered per month">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={monthlySigns}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" {...AX} />
              <YAxis {...AX} allowDecimals={false} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="signups" fill="var(--accent)" radius={[4,4,0,0]} name="New Clients" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Top Cities" sub="Clients by location">
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={stats?.by_city||[]} layout="vertical">
              <XAxis type="number" {...AX} />
              <YAxis dataKey="city" type="category" {...AX} width={80} />
              <Tooltip contentStyle={TT} />
              <Bar dataKey="count" fill="#22c55e" radius={[0,4,4,0]} name="Clients" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'repeat(2,1fr)', gap:16 }}>
        <ChartCard title="Platform Operations" sub="">
          {[
            { label:'Total Rooms across all PGs', value:stats?.total_rooms||0,      color:'var(--accent)' },
            { label:'Active Residents',           value:stats?.total_residents||0,  color:'var(--success)' },
            { label:'Occupied Rooms',             value:stats?.occupied_rooms||0,   color:'var(--warning)' },
            { label:'Platform Occupancy',         value:`${occupancyPct}%`,         color: occupancyPct>=70?'var(--success)':'var(--warning)' },
            { label:'Open Complaints',            value:stats?.open_complaints||0,  color:'var(--danger)' },
          ].map(m => (
            <div key={m.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
              <span style={{ color:'var(--text-2)' }}>{m.label}</span>
              <span style={{ fontWeight:700, color:m.color }}>{m.value}</span>
            </div>
          ))}
        </ChartCard>

        <ChartCard title="Revenue Metrics" sub="">
          {[
            { label:'Active Subscriptions',  value:active.length,                              color:'var(--success)' },
            { label:'Trial Subscriptions',   value:companies.filter(c=>c.status==='trial').length, color:'var(--warning)' },
            { label:'Monthly Recurring Revenue', value:`₹${mrr.toLocaleString()}`,            color:'#FF6B35' },
            { label:'Annual Run Rate',       value:`₹${(mrr*12/100000).toFixed(1)}L`,          color:'var(--success)' },
            { label:'Avg MRR per Client',    value: active.length ? `₹${Math.round(mrr/active.length).toLocaleString()}` : '—', color:'var(--accent)' },
            { label:'Trial Conversion',      value:`${companies.length ? Math.round(active.length/companies.length*100) : 0}%`, color:'#8b5cf6' },
          ].map(m => (
            <div key={m.label} style={{ display:'flex', justifyContent:'space-between', padding:'8px 0', borderBottom:'1px solid var(--border)', fontSize:13 }}>
              <span style={{ color:'var(--text-2)' }}>{m.label}</span>
              <span style={{ fontWeight:700, color:m.color }}>{m.value}</span>
            </div>
          ))}
        </ChartCard>
      </div>
    </>
  );
}

/* ── Owner analytics ── */
function OwnerAnalytics() {
  const [occ,      setOcc]      = useState([]);
  const [rev,      setRev]      = useState([]);
  const [compBreak,setCompBreak]= useState([]);
  const [ratio,    setRatio]    = useState([]);
  const [payRate,  setPayRate]  = useState(null);
  const [rooms,    setRooms]    = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loading,  setLoading]  = useState(true);

  useEffect(() => {
    Promise.all([
      api.occupancyTrend(),
      api.revenueTrend(),
      api.complaintsBreakdown(),
      api.residentRatio(),
      api.paymentRate(),
      api.roomStatusChart(),
      api.dashboardStats(),
    ]).then(([o, r, cb, ra, pr, rm, st]) => {
      setOcc(o); setRev(r); setCompBreak(cb); setRatio(ra);
      setPayRate(pr); setRooms(rm); setStats(st);
    }).catch(console.error).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="spinner-wrap"><div className="spinner" /><span>Loading analytics…</span></div>;

  const occupancy = stats?.total_rooms ? Math.round((stats.occupied_rooms / stats.total_rooms) * 100) : 0;

  return (
    <>
      <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
        {[
          { label:'Total Residents', value: stats?.total_residents||0,                           icon:'👥', color:'var(--accent)' },
          { label:'Occupancy Rate',  value: `${occupancy}%`,                                     icon:'🏠', color:'var(--success)' },
          { label:'Payment Rate',    value: `${payRate?.rate||0}%`,                              icon:'💰', color:'var(--warning)' },
          { label:'Monthly Revenue', value: `₹${(stats?.monthly_revenue||0).toLocaleString()}`,  icon:'📈', color:'#8b5cf6' },
        ].map(k => (
          <div key={k.label} className="stat-card">
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start' }}>
              <div>
                <div className="stat-label">{k.label}</div>
                <div className="stat-value" style={{ color:k.color }}>{k.value}</div>
              </div>
              <span style={{ fontSize:26, opacity:0.65 }}>{k.icon}</span>
            </div>
          </div>
        ))}
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'3fr 2fr', gap:16, marginBottom:16 }}>
        <ChartCard title="Occupancy Trend — Last 6 Months">
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={occ}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" {...AX} />
              <YAxis {...AX} />
              <Tooltip contentStyle={TT} />
              <Line type="monotone" dataKey="occupancy" stroke="var(--accent)" strokeWidth={2.5} dot={{ fill:'var(--accent)', r:4 }} name="Residents" />
            </LineChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Revenue Trend — Last 6 Months">
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={rev}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
              <XAxis dataKey="month" {...AX} />
              <YAxis {...AX} tickFormatter={v => `₹${(v/1000).toFixed(0)}k`} />
              <Tooltip formatter={v => [`₹${v.toLocaleString()}`, 'Revenue']} contentStyle={TT} />
              <Bar dataKey="revenue" fill="#22c55e" radius={[4,4,0,0]} name="Revenue" />
            </BarChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16, marginBottom:16 }}>
        <ChartCard title="Complaints by Category">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={compBreak} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                label={({ name, percent }) => `${name} ${(percent*100).toFixed(0)}%`} labelLine={false}>
                {compBreak.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ color:'var(--text-2)', fontSize:12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Tenant Occupation Breakdown">
          <ResponsiveContainer width="100%" height={230}>
            <PieChart>
              <Pie data={ratio} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={80}
                label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {ratio.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ color:'var(--text-2)', fontSize:12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <div style={{ display:'grid', gridTemplateColumns:'2fr 3fr', gap:16 }}>
        <ChartCard title="Room Status Distribution">
          <ResponsiveContainer width="100%" height={200}>
            <PieChart>
              <Pie data={rooms} dataKey="value" nameKey="name" cx="50%" cy="50%"
                innerRadius={45} outerRadius={75}
                label={({ name, value }) => `${name}: ${value}`} labelLine={false}>
                {rooms.map((_, i) => <Cell key={i} fill={COLORS[i%COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TT} />
              <Legend wrapperStyle={{ color:'var(--text-2)', fontSize:12 }} />
            </PieChart>
          </ResponsiveContainer>
        </ChartCard>

        <ChartCard title="Payment Collection">
          {payRate && (
            <div>
              <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginBottom:16, textAlign:'center' }}>
                <div>
                  <div style={{ fontSize:30, fontWeight:800, color:'var(--accent)' }}>{payRate.rate}%</div>
                  <div style={{ fontSize:11, color:'var(--text-3)' }}>Collection Rate</div>
                </div>
                <div>
                  <div style={{ fontSize:30, fontWeight:800, color:'var(--success)' }}>{payRate.paid}</div>
                  <div style={{ fontSize:11, color:'var(--text-3)' }}>Paid This Month</div>
                </div>
                <div>
                  <div style={{ fontSize:30, fontWeight:800, color:'var(--warning)' }}>{payRate.total - payRate.paid}</div>
                  <div style={{ fontSize:11, color:'var(--text-3)' }}>Pending</div>
                </div>
              </div>
              <div style={{ height:14, background:'var(--bg-hover)', borderRadius:7, overflow:'hidden', marginBottom:6 }}>
                <div style={{
                  height:'100%', width:`${payRate.rate}%`,
                  background:'linear-gradient(90deg, var(--accent), #22c55e)',
                  borderRadius:7, transition:'width 1s ease'
                }} />
              </div>
              <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:18 }}>{payRate.paid} of {payRate.total} residents paid</div>
              <div style={{ fontWeight:600, fontSize:12, color:'var(--text-2)', marginBottom:10 }}>Top Complaint Categories</div>
              {compBreak.slice().sort((a,b)=>b.value-a.value).slice(0,5).map((c, i) => (
                <div key={c.name} style={{ display:'flex', alignItems:'center', gap:10, marginBottom:8 }}>
                  <div style={{ width:9, height:9, borderRadius:'50%', background:COLORS[i%COLORS.length], flexShrink:0 }} />
                  <div style={{ flex:1, fontSize:12, textTransform:'capitalize', color:'var(--text-1)' }}>{c.name}</div>
                  <div style={{ fontSize:12, fontWeight:700, color:COLORS[i%COLORS.length] }}>{c.value}</div>
                  <div style={{ width:70, height:5, background:'var(--bg-hover)', borderRadius:3, overflow:'hidden', flexShrink:0 }}>
                    <div style={{
                      height:'100%',
                      width:`${(c.value / Math.max(...compBreak.map(x=>x.value)))*100}%`,
                      background:COLORS[i%COLORS.length], borderRadius:3
                    }} />
                  </div>
                </div>
              ))}
            </div>
          )}
        </ChartCard>
      </div>
    </>
  );
}

export default function Analytics() {
  const { user } = useAuth();
  if (user?.role === 'super_admin') return <PlatformAnalytics />;
  return <OwnerAnalytics />;
}
