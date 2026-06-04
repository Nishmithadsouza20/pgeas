import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

const AuthContext = createContext(null);

async function fetchCompany(tok) {
  try {
    const r = await fetch('/api/companies/my-settings', { headers: { Authorization: `Bearer ${tok}` } });
    return r.ok ? r.json() : null;
  } catch { return null; }
}

async function fetchResidentCompany(tok) {
  try {
    const r = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${tok}` } });
    if (!r.ok) return null;
    const d = await r.json();
    return d.company_plan ? { plan: d.company_plan, property_type: d.company_property_type || 'pg' } : null;
  } catch { return null; }
}

export function AuthProvider({ children }) {
  const [user,         setUser]         = useState(null);
  const [company,      setCompany]      = useState(null);
  const [token,        setToken]        = useState(localStorage.getItem('pgease_token'));
  const [loading,      setLoading]      = useState(true);
  const [planAlert,    setPlanAlert]    = useState(null);
  const companyRef = useRef(null);
  const userRef    = useRef(null);

  useEffect(() => {
    if (token) {
      fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } })
        .then(r => r.ok ? r.json() : null)
        .then(async data => {
          if (data) {
            setUser(data);
            userRef.current = data;
            if (data.role === 'owner' || data.role === 'super_admin') {
              const c = await fetchCompany(token);
              setCompany(c);
              companyRef.current = c;
            } else if (data.role === 'customer' && data.company_plan) {
              const c = { plan: data.company_plan, property_type: data.company_property_type || 'pg' };
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

  // Poll every 30s to detect plan/status changes made by super_admin
  useEffect(() => {
    if (!token) return;
    const poll = setInterval(async () => {
      const current = companyRef.current;
      if (!current) return;
      const role = userRef.current?.role;
      const fresh = role === 'customer'
        ? await fetchResidentCompany(token)
        : await fetchCompany(token);
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
    userRef.current = data.user;
    if (data.user.role === 'owner' || data.user.role === 'super_admin') {
      const c = await fetchCompany(data.token);
      setCompany(c);
      companyRef.current = c;
    } else if (data.user.role === 'customer') {
      const c = await fetchResidentCompany(data.token);
      if (c) { setCompany(c); companyRef.current = c; }
    }
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('pgease_token');
    setToken(null);
    setUser(null);
    setCompany(null);
    userRef.current    = null;
    companyRef.current = null;
  };

  const refreshUser = async () => {
    if (!token) return;
    try {
      const res  = await fetch('/api/auth/me', { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) { logout(); return; }
      const data = await res.json();
      setUser(data);
      userRef.current = data;
    } catch { logout(); }
  };

  const refreshCompany = async () => {
    if (!token) return;
    const role = userRef.current?.role;
    const c = role === 'customer'
      ? await fetchResidentCompany(token)
      : await fetchCompany(token);
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
