import React, { useEffect, useRef, useState } from 'react';
import { api } from '../utils/api';

export default function NotificationBell() {
  const [count,   setCount]   = useState(0);
  const [notifs,  setNotifs]  = useState([]);
  const [open,    setOpen]    = useState(false);
  const ref = useRef(null);

  const fetchCount = async () => {
    const d = await api.getUnreadCount().catch(() => ({ count: 0 }));
    setCount(d.count || 0);
  };

  const fetchNotifs = async () => {
    const d = await api.getNotifications().catch(() => []);
    setNotifs(Array.isArray(d) ? d : []);
  };

  useEffect(() => {
    fetchCount();
    const iv = setInterval(fetchCount, 30000);
    return () => clearInterval(iv);
  }, []);

  useEffect(() => {
    if (!open) return;
    fetchNotifs();
    const handler = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  const markAll = async () => {
    await api.markAllNotifsRead().catch(() => {});
    setCount(0);
    setNotifs(n => n.map(x => ({ ...x, is_read: 1 })));
  };

  const markOne = async (id) => {
    await api.markNotifRead(id).catch(() => {});
    setNotifs(n => n.map(x => x.id === id ? { ...x, is_read: 1 } : x));
    setCount(c => Math.max(0, c - 1));
  };

  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          background: 'none', border: 'none', cursor: 'pointer', fontSize: 20,
          padding: '4px 8px', borderRadius: 8, color: 'var(--text-1)',
          position: 'relative', display: 'flex', alignItems: 'center',
        }}
        title="Notifications"
      >
        🔔
        {count > 0 && (
          <span style={{
            position: 'absolute', top: 0, right: 0,
            background: '#ef4444', color: '#fff', borderRadius: 10,
            fontSize: 10, fontWeight: 800, minWidth: 16, height: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px',
          }}>{count > 99 ? '99+' : count}</span>
        )}
      </button>

      {open && (
        <div style={{
          position: 'absolute', top: 42, right: 0, width: 340,
          background: 'var(--bg-card)', border: '1px solid var(--border)',
          borderRadius: 12, boxShadow: '0 8px 32px rgba(0,0,0,0.18)', zIndex: 999,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '14px 16px', borderBottom: '1px solid var(--border)' }}>
            <span style={{ fontWeight: 800, fontSize: 14 }}>Notifications</span>
            {count > 0 && (
              <button onClick={markAll} style={{ fontSize: 11, color: 'var(--accent)', background: 'none', border: 'none', cursor: 'pointer', fontWeight: 700 }}>
                Mark all read
              </button>
            )}
          </div>
          <div style={{ maxHeight: 360, overflowY: 'auto' }}>
            {notifs.length === 0 ? (
              <div style={{ padding: 32, textAlign: 'center', color: 'var(--text-3)', fontSize: 13 }}>
                <div style={{ fontSize: 28, marginBottom: 8 }}>🔕</div>
                No notifications
              </div>
            ) : notifs.map(n => (
              <div key={n.id} onClick={() => !n.is_read && markOne(n.id)}
                style={{
                  padding: '12px 16px', borderBottom: '1px solid var(--border)',
                  background: n.is_read ? 'transparent' : 'var(--bg-hover)',
                  cursor: n.is_read ? 'default' : 'pointer',
                  transition: 'background 0.15s',
                }}>
                <div style={{ display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                  {!n.is_read && <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#3b82f6', marginTop: 5, flexShrink: 0 }} />}
                  <div style={{ flex: 1, marginLeft: n.is_read ? 17 : 0 }}>
                    <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text-1)', marginBottom: 2 }}>{n.title}</div>
                    <div style={{ fontSize: 12, color: 'var(--text-2)' }}>{n.body}</div>
                    <div style={{ fontSize: 10, color: 'var(--text-3)', marginTop: 4 }}>
                      {n.created_at ? new Date(n.created_at).toLocaleString('en-IN', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : ''}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
