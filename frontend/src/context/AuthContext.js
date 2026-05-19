import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AuthContext = createContext(null);

async function fetchCompany(tok) {
  try {
    const r = await fetch('/api/companies/my-settings', { headers: { Authorization: `Bearer ${tok}` } });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null);
  const [company,      setCompany]      = useState(null);
  const [token,        setToken]        = useState(localStorage.getItem('pgease_token'));
  const [loading,      setLoading]      = useState(true);
  const [planAlert,    setPlanAlert]    = useState(null); // { old, new, message }
  const companyRef = useRef(null);

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(async data => {
          if (data) {
            setUser(data);
            if (data.role === 'owner' || data.role === 'super_admin') {
              const c = await fetchCompany(token);
              setCompany(c);
              companyRef.current = c;
            }
          } else { logout(); }
        })
        .catch(() => logout())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Poll every 30s for owners to detect plan/status changes from super_admin
  useEffect(() => {
    if (!token) return;
    const poll = setInterval(async () => {
      const current = companyRef.current;
      if (!current) return;
      const fresh = await fetchCompany(token);
      if (!fresh) return;
      const changed = [];
      if (current.plan   !== fresh.plan)   changed.push({ field:'plan',   old: current.plan,   now: fresh.plan });
      if (current.status !== fresh.status) changed.push({ field:'status', old: current.status, now: fresh.status });
      if (changed.length) {
        setPlanAlert(changed);
        setTimeout(() => setPlanAlert(null), 8000);
      }
      setCompany(fresh);
      companyRef.current = fresh;
    }, 30000);
    return () => clearInterval(poll);
  }, [token]);

  const login = async (email, password) => {
    const res  = await fetch('/api/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || 'Login failed');
    localStorage.setItem('pgease_token', data.token);
    setToken(data.token);
    setUser(data.user);
    if (data.user.role === 'owner' || data.user.role === 'super_admin') {
      const c = await fetchCompany(data.token);
      setCompany(c);
    }
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('pgease_token');
    setToken(null);
    setUser(null);
    setCompany(null);
  };

  const refreshUser = async () => {
    if (!token) return;
    const res  = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
    const data = await res.json();
    if (res.ok) setUser(data);
  };

  const refreshCompany = async () => {
    if (!token) return;
    const c = await fetchCompany(token);
    setCompany(c);
    companyRef.current = c;
  };

  return (
    <AuthContext.Provider value={{ user, company, token, loading, planAlert, setPlanAlert, login, logout, refreshUser, refreshCompany }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
