import React, { createContext, useCallback, useContext, useState } from 'react';

const ToastContext = createContext(null);

let _toastId = 0;

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const add = useCallback((message, type = 'info', duration = 3500) => {
    const id = ++_toastId;
    setToasts(t => [...t, { id, message, type }]);
    setTimeout(() => setToasts(t => t.filter(x => x.id !== id)), duration);
  }, []);

  const remove = useCallback(id => setToasts(t => t.filter(x => x.id !== id)), []);

  const toast = {
    success: (msg, dur) => add(msg, 'success', dur),
    error:   (msg, dur) => add(msg, 'error',   dur),
    info:    (msg, dur) => add(msg, 'info',     dur),
    warning: (msg, dur) => add(msg, 'warning',  dur),
  };

  const ICONS = { success: '✓', error: '✕', info: 'ℹ', warning: '⚠' };
  const COLORS = {
    success: { bg: 'rgba(34,197,94,0.12)',  border: 'rgba(34,197,94,0.35)',  text: '#22c55e' },
    error:   { bg: 'rgba(239,68,68,0.12)',  border: 'rgba(239,68,68,0.35)',  text: '#ef4444' },
    info:    { bg: 'rgba(59,130,246,0.12)', border: 'rgba(59,130,246,0.35)', text: '#3b82f6' },
    warning: { bg: 'rgba(245,158,11,0.12)', border: 'rgba(245,158,11,0.35)', text: '#f59e0b' },
  };

  return (
    <ToastContext.Provider value={toast}>
      {children}
      <div style={{
        position: 'fixed', bottom: 24, right: 24, zIndex: 9999,
        display: 'flex', flexDirection: 'column', gap: 10, maxWidth: 360,
        pointerEvents: 'none',
      }}>
        {toasts.map(t => {
          const c = COLORS[t.type] || COLORS.info;
          return (
            <div key={t.id} style={{
              display: 'flex', alignItems: 'flex-start', gap: 10,
              padding: '12px 14px', borderRadius: 12,
              background: 'var(--bg-card)', border: `1px solid ${c.border}`,
              boxShadow: '0 8px 32px rgba(0,0,0,0.25)',
              animation: 'slideUp 0.25s ease',
              pointerEvents: 'auto', cursor: 'pointer',
            }} onClick={() => remove(t.id)}>
              <div style={{
                width: 24, height: 24, borderRadius: '50%', flexShrink: 0,
                background: c.bg, display: 'flex', alignItems: 'center',
                justifyContent: 'center', fontSize: 13, color: c.text, fontWeight: 800,
              }}>{ICONS[t.type]}</div>
              <div style={{ flex: 1, fontSize: 13, color: 'var(--text-1)', paddingTop: 2 }}>{t.message}</div>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export const useToast = () => useContext(ToastContext);
