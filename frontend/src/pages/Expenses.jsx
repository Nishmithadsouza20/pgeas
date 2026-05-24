import React, { useEffect, useState } from 'react';
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { api } from '../utils/api';

const MONTHS  = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const EXP_CATS = ['food','electricity','water','gas','salary','maintenance','internet','other'];
const EXP_COLOR = {
  food:'#22c55e', electricity:'#f59e0b', water:'#3b82f6', gas:'#8b5cf6',
  salary:'#FF6B35', maintenance:'#ef4444', internet:'#06b6d4', other:'#6b7280'
};
const EXP_ICON = {
  food:'🍽️', electricity:'⚡', water:'💧', gas:'🔥',
  salary:'👥', maintenance:'🔧', internet:'📶', other:'📦'
};
const FOOD_CATS = ['grocery','vegetables','dairy','oil_spices','beverages'];
const FOOD_COLOR = { grocery:'#FF6B35', vegetables:'#22c55e', dairy:'#3b82f6', oil_spices:'#f59e0b', beverages:'#8b5cf6' };
const EMPTY_EXP  = { category:'food', description:'', amount:'', expense_date:'', payment_mode:'cash', vendor:'' };
const EMPTY_FOOD = { item_name:'', category:'grocery', unit:'kg', quantity_in_stock:'', min_quantity:'', unit_price:'', last_purchased_date:'', supplier:'' };

const now = new Date();

export default function Expenses() {
  const [tab, setTab]         = useState('expenses');

  // Expenses state
  const [expenses,  setExpenses]  = useState([]);
  const [summary,   setSummary]   = useState(null);
  const [month,     setMonth]     = useState(now.getMonth()+1);
  const [year,      setYear]      = useState(now.getFullYear());
  const [catFilter, setCatFilter] = useState('');
  const [expModal,  setExpModal]  = useState(false);
  const [expForm,   setExpForm]   = useState(EMPTY_EXP);
  const [expEdit,   setExpEdit]   = useState(null);

  // Food inventory state
  const [inventory, setInventory] = useState([]);
  const [foodStats, setFoodStats] = useState(null);
  const [lowStock,  setLowStock]  = useState([]);
  const [foodModal, setFoodModal] = useState(false);
  const [foodForm,  setFoodForm]  = useState(EMPTY_FOOD);
  const [foodEdit,  setFoodEdit]  = useState(null);
  const [foodCatF,  setFoodCatF]  = useState('');

  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(true);

  const loadExpenses = () => {
    const q = new URLSearchParams({ month, year });
    if (catFilter) q.set('category', catFilter);
    return Promise.all([
      api.getExpenses(q.toString()),
      api.getExpenseSummary(month, year),
    ]).then(([e, s]) => { setExpenses(e); setSummary(s); });
  };

  const loadFood = () =>
    Promise.all([api.getFoodInventory(), api.getFoodStats(), api.getLowStock()])
      .then(([inv, st, low]) => { setInventory(inv); setFoodStats(st); setLowStock(low); });

  const loadAll = () => {
    setLoading(true);
    Promise.all([loadExpenses(), loadFood()])
      .catch(console.error)
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAll(); }, [month, year, catFilter]);

  // Expense handlers
  const handleExp  = e => setExpForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const openNewExp = () => {
    const today = new Date().toISOString().slice(0,10);
    setExpForm({ ...EMPTY_EXP, expense_date: today });
    setExpEdit(null); setError(''); setExpModal(true);
  };
  const openEditExp = e => { setExpForm({ ...e }); setExpEdit(e.id); setError(''); setExpModal(true); };
  const submitExp  = async e => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...expForm, amount: Number(expForm.amount) };
      if (expEdit) await api.updateExpense(expEdit, payload);
      else         await api.createExpense(payload);
      setExpModal(false); loadExpenses();
    } catch (err) { setError(err.message); }
  };
  const delExp = async id => {
    if (!window.confirm('Delete this expense?')) return;
    await api.deleteExpense(id); loadExpenses();
  };

  // Food handlers
  const handleFood  = e => setFoodForm(f => ({ ...f, [e.target.name]: e.target.value }));
  const openNewFood = () => { setFoodForm(EMPTY_FOOD); setFoodEdit(null); setError(''); setFoodModal(true); };
  const openEditFood = f => { setFoodForm({ ...f }); setFoodEdit(f.id); setError(''); setFoodModal(true); };
  const submitFood  = async e => {
    e.preventDefault(); setError('');
    try {
      const payload = { ...foodForm, quantity_in_stock: Number(foodForm.quantity_in_stock),
        min_quantity: Number(foodForm.min_quantity), unit_price: Number(foodForm.unit_price) };
      if (foodEdit) await api.updateFoodItem(foodEdit, payload);
      else          await api.createFoodItem(payload);
      setFoodModal(false); loadFood();
    } catch (err) { setError(err.message); }
  };
  const delFood = async id => {
    if (!window.confirm('Remove this item?')) return;
    await api.deleteFoodItem(id); loadFood();
  };

  const filteredFood = foodCatF ? inventory.filter(i => i.category === foodCatF) : inventory;
  const pieData = (summary?.by_category || []).map(c => ({ name: c.category, value: Math.round(c.total) }));

  const ttStyle = { background:'var(--bg-card)', border:'1px solid var(--border)', color:'var(--text-1)', borderRadius:8, fontSize:12 };

  return (
    <>
      {/* Plan banner */}
      <div style={{
        background:'linear-gradient(135deg,#0f1a2e,#1a2e1a)',
        border:'1px solid rgba(34,197,94,0.3)', borderRadius:12,
        padding:'14px 20px', marginBottom:24,
        display:'flex', alignItems:'center', gap:12
      }}>
        <span style={{ fontSize:20 }}>💰</span>
        <div>
          <div style={{ fontSize:13, fontWeight:700, color:'#4ade80' }}>Premium Feature — Expense & Inventory Management</div>
          <div style={{ fontSize:12, color:'#64748b' }}>Track all PG running costs, food stock, and get P&L insights</div>
        </div>
        <span className="badge badge-success" style={{ marginLeft:'auto', flexShrink:0 }}>Premium+</span>
      </div>

      {/* Tab switcher */}
      <div style={{ display:'flex', gap:8, marginBottom:24 }}>
        {[['expenses','💸 Expenses'],['food','🥦 Food Inventory']].map(([k,l]) => (
          <button key={k} className={`filter-btn ${tab===k?'active':''}`}
            style={{ padding:'8px 20px', fontSize:13 }} onClick={() => setTab(k)}>
            {l}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="spinner-wrap"><div className="spinner" /><span>Loading…</span></div>
      ) : tab === 'expenses' ? (

        /* ── EXPENSES TAB ─────────────────────────────── */
        <>
          {/* P&L Summary */}
          {summary && (
            <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:16, marginBottom:24 }}>
              <div className="stat-card">
                <div className="stat-label">Revenue (Rent)</div>
                <div className="stat-value" style={{ color:'var(--success)' }}>₹{summary.revenue.toLocaleString()}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Total Expenses</div>
                <div className="stat-value" style={{ color:'var(--danger)' }}>₹{summary.total_expenses.toLocaleString()}</div>
              </div>
              <div className="stat-card">
                <div className="stat-label">Net Profit</div>
                <div className="stat-value" style={{ color: summary.net_profit >= 0 ? 'var(--success)' : 'var(--danger)' }}>
                  {summary.net_profit >= 0 ? '+' : ''}₹{Math.abs(summary.net_profit).toLocaleString()}
                </div>
                <div className="stat-sub">
                  {summary.net_profit >= 0 ? 'Profitable month' : 'Loss this month'}
                </div>
              </div>
            </div>
          )}

          <div style={{ display:'grid', gridTemplateColumns:'1fr 320px', gap:16, marginBottom:24 }}>
            {/* Expense breakdown pie */}
            {pieData.length > 0 && (
              <div className="card" style={{ padding:20 }}>
                <div style={{ fontWeight:700, fontSize:14, color:'var(--text-1)', marginBottom:16 }}>Expense Breakdown</div>
                <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:16 }}>
                  <ResponsiveContainer width="100%" height={180}>
                    <PieChart>
                      <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%"
                        innerRadius={45} outerRadius={75} labelLine={false}>
                        {pieData.map((d, i) => (
                          <Cell key={i} fill={EXP_COLOR[d.name] || '#6b7280'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={v => [`₹${v.toLocaleString()}`, '']} contentStyle={ttStyle} />
                    </PieChart>
                  </ResponsiveContainer>
                  <div style={{ display:'flex', flexDirection:'column', gap:8, justifyContent:'center' }}>
                    {pieData.map(d => (
                      <div key={d.name} style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <div style={{ width:10, height:10, borderRadius:3, background:EXP_COLOR[d.name]||'#6b7280', flexShrink:0 }} />
                        <span style={{ fontSize:12, textTransform:'capitalize', color:'var(--text-2)', flex:1 }}>{d.name}</span>
                        <span style={{ fontSize:12, fontWeight:700, color:'var(--text-1)' }}>₹{d.value.toLocaleString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Quick category totals */}
            <div className="card" style={{ padding:20 }}>
              <div style={{ fontWeight:700, fontSize:14, color:'var(--text-1)', marginBottom:14 }}>Category Totals</div>
              <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                {(summary?.by_category || []).map(c => (
                  <div key={c.category}>
                    <div style={{ display:'flex', justifyContent:'space-between', marginBottom:4 }}>
                      <span style={{ fontSize:12, color:'var(--text-2)', textTransform:'capitalize' }}>
                        {EXP_ICON[c.category]} {c.category}
                      </span>
                      <span style={{ fontSize:12, fontWeight:700, color:EXP_COLOR[c.category]||'var(--text-1)' }}>
                        ₹{Math.round(c.total).toLocaleString()}
                      </span>
                    </div>
                    <div style={{ height:4, background:'var(--bg-hover)', borderRadius:4, overflow:'hidden' }}>
                      <div style={{
                        height:'100%', borderRadius:4,
                        background: EXP_COLOR[c.category]||'var(--accent)',
                        width:`${summary.total_expenses > 0 ? (c.total/summary.total_expenses*100) : 0}%`,
                        transition:'width 0.8s ease'
                      }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Filters + Add */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexWrap:'wrap', gap:10 }}>
            <div style={{ display:'flex', gap:10, flexWrap:'wrap', alignItems:'center' }}>
              <select value={month} onChange={e=>setMonth(e.target.value)} className="form-input" style={{ width:'auto' }}>
                {MONTHS.map((m,i) => <option key={i+1} value={i+1}>{m}</option>)}
              </select>
              <select value={year} onChange={e=>setYear(e.target.value)} className="form-input" style={{ width:'auto' }}>
                {[2024,2025,2026].map(y => <option key={y} value={y}>{y}</option>)}
              </select>
              <select value={catFilter} onChange={e=>setCatFilter(e.target.value)} className="form-input" style={{ width:'auto' }}>
                <option value="">All Categories</option>
                {EXP_CATS.map(c => <option key={c} value={c}>{c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
              </select>
            </div>
            <button className="btn btn-primary btn-sm" onClick={openNewExp}>+ Add Expense</button>
          </div>

          <div className="card" style={{ padding:0 }}>
            <div className="table-wrap">
              <table className="pg-table">
                <thead>
                  <tr><th>Date</th><th>Category</th><th>Description</th><th>Vendor</th><th>Mode</th><th>Amount</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {expenses.map(e => (
                    <tr key={e.id}>
                      <td style={{ color:'var(--text-3)', fontSize:12, whiteSpace:'nowrap' }}>{e.expense_date}</td>
                      <td>
                        <span style={{ display:'inline-flex', alignItems:'center', gap:5, fontSize:12, fontWeight:600,
                          textTransform:'capitalize', color: EXP_COLOR[e.category]||'var(--text-2)' }}>
                          {EXP_ICON[e.category]} {e.category}
                        </span>
                      </td>
                      <td style={{ color:'var(--text-1)', maxWidth:280 }}>{e.description}</td>
                      <td style={{ color:'var(--text-3)', fontSize:12 }}>{e.vendor || '—'}</td>
                      <td>
                        <span className="badge badge-info" style={{ textTransform:'capitalize', fontSize:10 }}>
                          {e.payment_mode}
                        </span>
                      </td>
                      <td style={{ fontWeight:700, color:'var(--danger)' }}>₹{Number(e.amount).toLocaleString()}</td>
                      <td>
                        <div style={{ display:'flex', gap:6 }}>
                          <button className="btn btn-ghost btn-xs" onClick={() => openEditExp(e)}>Edit</button>
                          <button className="btn btn-danger btn-xs" onClick={() => delExp(e.id)}>Del</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {expenses.length === 0 && (
                    <tr><td colSpan={7}>
                      <div className="empty-state"><div className="empty-state-icon">💰</div><h4>No expenses</h4><p>No expenses recorded for this period.</p></div>
                    </td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </>

      ) : (

        /* ── FOOD INVENTORY TAB ──────────────────────── */
        <>
          {/* Food stats */}
          <div style={{ display:'grid', gridTemplateColumns:'repeat(4,1fr)', gap:16, marginBottom:24 }}>
            <div className="stat-card">
              <div className="stat-label">Total Items</div>
              <div className="stat-value" style={{ color:'var(--accent)' }}>{foodStats?.total_items || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Low Stock Alerts</div>
              <div className="stat-value" style={{ color:'var(--danger)' }}>{foodStats?.low_stock_count || 0}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Stock Value</div>
              <div className="stat-value" style={{ color:'var(--success)', fontSize:20 }}>
                ₹{(foodStats?.stock_value || 0).toLocaleString()}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Categories</div>
              <div className="stat-value">{FOOD_CATS.length}</div>
            </div>
          </div>

          {/* Low stock alerts */}
          {lowStock.length > 0 && (
            <div className="alert alert-error" style={{ marginBottom:16, display:'flex', flexWrap:'wrap', gap:8, alignItems:'center' }}>
              <strong>Low Stock:</strong>
              {lowStock.map(i => (
                <span key={i.id} className="badge badge-danger">{i.item_name} ({i.quantity_in_stock} {i.unit})</span>
              ))}
            </div>
          )}

          {/* Filter + Add */}
          <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:18, flexWrap:'wrap', gap:10 }}>
            <div style={{ display:'flex', gap:8, flexWrap:'wrap' }}>
              <button className={`filter-btn ${foodCatF===''?'active':''}`} onClick={() => setFoodCatF('')}>All</button>
              {FOOD_CATS.map(c => (
                <button key={c} className={`filter-btn ${foodCatF===c?'active':''}`}
                  onClick={() => setFoodCatF(c)} style={{ textTransform:'capitalize' }}>{c.replace('_',' ')}</button>
              ))}
            </div>
            <button className="btn btn-primary btn-sm" onClick={openNewFood}>+ Add Item</button>
          </div>

          <div style={{ display:'grid', gridTemplateColumns:'repeat(auto-fill,minmax(280px,1fr))', gap:16 }}>
            {filteredFood.map(item => {
              const isLow  = item.quantity_in_stock <= item.min_quantity;
              const pct    = item.min_quantity > 0 ? Math.min((item.quantity_in_stock / (item.min_quantity * 4)) * 100, 100) : 100;
              return (
                <div key={item.id} className="card" style={{ padding:18, borderLeft: isLow ? '3px solid var(--danger)' : '3px solid transparent' }}>
                  <div style={{ display:'flex', justifyContent:'space-between', alignItems:'flex-start', marginBottom:12 }}>
                    <div>
                      <div style={{ fontWeight:700, fontSize:14, color:'var(--text-1)' }}>{item.item_name}</div>
                      <div style={{ fontSize:11, color: FOOD_COLOR[item.category]||'var(--accent)', textTransform:'capitalize', fontWeight:600, marginTop:2 }}>
                        {item.category.replace('_',' ')}
                      </div>
                    </div>
                    {isLow && <span className="badge badge-danger" style={{ fontSize:10 }}>Low Stock</span>}
                  </div>

                  <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:8, marginBottom:12 }}>
                    <div style={{ padding:'8px 10px', background:'var(--bg-hover)', borderRadius:8 }}>
                      <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:2 }}>IN STOCK</div>
                      <div style={{ fontWeight:700, fontSize:16, color: isLow ? 'var(--danger)' : 'var(--success)' }}>
                        {item.quantity_in_stock} {item.unit}
                      </div>
                    </div>
                    <div style={{ padding:'8px 10px', background:'var(--bg-hover)', borderRadius:8 }}>
                      <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:2 }}>UNIT PRICE</div>
                      <div style={{ fontWeight:700, fontSize:16, color:'var(--text-1)' }}>₹{item.unit_price}</div>
                    </div>
                  </div>

                  <div style={{ marginBottom:12 }}>
                    <div style={{ display:'flex', justifyContent:'space-between', fontSize:10, color:'var(--text-3)', marginBottom:4 }}>
                      <span>Stock level</span>
                      <span>Min: {item.min_quantity} {item.unit}</span>
                    </div>
                    <div style={{ height:6, background:'var(--bg-hover)', borderRadius:4, overflow:'hidden' }}>
                      <div style={{
                        height:'100%', borderRadius:4,
                        background: isLow ? 'var(--danger)' : 'var(--success)',
                        width:`${pct}%`, transition:'width 0.8s ease'
                      }} />
                    </div>
                  </div>

                  {item.supplier && (
                    <div style={{ fontSize:11, color:'var(--text-3)', marginBottom:10 }}>
                      Supplier: {item.supplier}
                      {item.last_purchased_date && ` · Last bought: ${item.last_purchased_date}`}
                    </div>
                  )}

                  <div style={{ display:'flex', gap:8 }}>
                    <button className="btn btn-ghost btn-sm" style={{ flex:1 }} onClick={() => openEditFood(item)}>Update Stock</button>
                    <button className="btn btn-danger btn-sm" onClick={() => delFood(item.id)}>✕</button>
                  </div>
                </div>
              );
            })}
            {filteredFood.length === 0 && (
              <div className="empty-state" style={{ gridColumn:'1/-1' }}>
                <div className="empty-state-icon">🥬</div>
                <h4>No inventory items</h4>
                <p>No food inventory items found.</p>
              </div>
            )}
          </div>
        </>
      )}

      {/* Expense Modal */}
      {expModal && (
        <div className="modal-overlay" onClick={() => setExpModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:520 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-1)' }}>{expEdit ? 'Edit Expense' : 'Add Expense'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setExpModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}
            <form onSubmit={submitExp}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select name="category" value={expForm.category} onChange={handleExp} className="form-input">
                    {EXP_CATS.map(c => <option key={c} value={c}>{EXP_ICON[c]} {c.charAt(0).toUpperCase()+c.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Date</label>
                  <input name="expense_date" type="date" value={expForm.expense_date} onChange={handleExp} className="form-input" required />
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Description</label>
                  <input name="description" value={expForm.description} onChange={handleExp} className="form-input" placeholder="Monthly groceries — rice, dal, oil…" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Amount (₹)</label>
                  <input name="amount" type="number" value={expForm.amount} onChange={handleExp} className="form-input" placeholder="5000" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Payment Mode</label>
                  <select name="payment_mode" value={expForm.payment_mode} onChange={handleExp} className="form-input">
                    {['cash','online','cheque','upi'].map(m => <option key={m} value={m}>{m.charAt(0).toUpperCase()+m.slice(1)}</option>)}
                  </select>
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Vendor / Supplier (optional)</label>
                  <input name="vendor" value={expForm.vendor} onChange={handleExp} className="form-input" placeholder="Sri Ram Traders" />
                </div>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setExpModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Expense</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Food Item Modal */}
      {foodModal && (
        <div className="modal-overlay" onClick={() => setFoodModal(false)}>
          <div className="modal-box" onClick={e => e.stopPropagation()} style={{ maxWidth:520 }}>
            <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
              <h3 style={{ fontSize:18, fontWeight:700, color:'var(--text-1)' }}>{foodEdit ? 'Update Stock Item' : 'Add Inventory Item'}</h3>
              <button className="btn btn-ghost btn-sm" onClick={() => setFoodModal(false)}>✕</button>
            </div>
            {error && <div className="alert alert-error" style={{ marginBottom:16 }}>{error}</div>}
            <form onSubmit={submitFood}>
              <div style={{ display:'grid', gridTemplateColumns:'1fr 1fr', gap:14 }}>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Item Name</label>
                  <input name="item_name" value={foodForm.item_name} onChange={handleFood} className="form-input" placeholder="Basmati Rice" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Category</label>
                  <select name="category" value={foodForm.category} onChange={handleFood} className="form-input">
                    {FOOD_CATS.map(c => <option key={c} value={c}>{c.replace('_',' ').replace(/\b\w/g,l=>l.toUpperCase())}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Unit</label>
                  <select name="unit" value={foodForm.unit} onChange={handleFood} className="form-input">
                    {['kg','litre','pieces','packet','dozen','bottle'].map(u => <option key={u} value={u}>{u}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Quantity in Stock</label>
                  <input name="quantity_in_stock" type="number" step="0.1" value={foodForm.quantity_in_stock} onChange={handleFood} className="form-input" placeholder="20" required />
                </div>
                <div className="form-group">
                  <label className="form-label">Min. Quantity (alert)</label>
                  <input name="min_quantity" type="number" step="0.1" value={foodForm.min_quantity} onChange={handleFood} className="form-input" placeholder="5" />
                </div>
                <div className="form-group">
                  <label className="form-label">Unit Price (₹)</label>
                  <input name="unit_price" type="number" step="0.01" value={foodForm.unit_price} onChange={handleFood} className="form-input" placeholder="65" />
                </div>
                <div className="form-group">
                  <label className="form-label">Last Purchase Date</label>
                  <input name="last_purchased_date" type="date" value={foodForm.last_purchased_date} onChange={handleFood} className="form-input" />
                </div>
                <div className="form-group" style={{ gridColumn:'1/-1' }}>
                  <label className="form-label">Supplier</label>
                  <input name="supplier" value={foodForm.supplier} onChange={handleFood} className="form-input" placeholder="Sri Ram Traders" />
                </div>
              </div>
              <div style={{ display:'flex', gap:10, marginTop:20, justifyContent:'flex-end' }}>
                <button type="button" className="btn btn-ghost" onClick={() => setFoodModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-primary">Save Item</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
