"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { getMe, login as apiLogin, register as apiRegister, setAuthToken, logoutApi, User } from "@/lib/api";

type AuthContextValue = {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? window.localStorage.getItem("token") : null;
    if (stored) {
      setToken(stored);
      setAuthToken(stored);
      getMe()
        .then(setUser)
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const doLogin = useCallback(async (email: string, password: string) => {
    const t = await apiLogin(email, password);
    setToken(t);
    window.localStorage.setItem("token", t);
    setAuthToken(t);
    const me = await getMe();
    setUser(me);
  }, []);

  const doRegister = useCallback(async (name: string, email: string, password: string) => {
    await apiRegister(name, email, password);
    await doLogin(email, password);
  }, [doLogin]);

  const logout = useCallback(() => {
    logoutApi();
    setUser(null);
    setToken(null);
    setAuthToken(null);
    if (typeof window !== "undefined") {
      window.localStorage.removeItem("token");
    }
  }, []);

  const value = useMemo<AuthContextValue>(
    () => ({ user, token, loading, login: doLogin, register: doRegister, logout }),
    [user, token, loading, doLogin, doRegister, logout]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}



