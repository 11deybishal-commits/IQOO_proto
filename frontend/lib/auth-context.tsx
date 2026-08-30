"use client";

import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { User, getMe } from "@/lib/api";

interface AuthContextValue {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  setToken: (t: string) => Promise<User | null>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  token: null,
  isLoading: true,
  setToken: async () => null,
  logout: () => {},
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setTokenState] = useState<string | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const logout = useCallback(() => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("sentinel_token");
    }
    setTokenState(null);
    setUser(null);
  }, []);

  const handleSetToken = useCallback(async (t: string): Promise<User | null> => {
    // Keep isLoading=true the whole time so page.tsx doesn't react to intermediate states
    if (typeof window !== "undefined") {
      localStorage.setItem("sentinel_token", t);
    }
    setTokenState(t);
    try {
      const userData = await getMe();
      setUser(userData);
      setIsLoading(false);
      return userData;
    } catch (err) {
      // Token invalid — clear everything and surface the error to the caller
      if (typeof window !== "undefined") {
        localStorage.removeItem("sentinel_token");
      }
      setTokenState(null);
      setUser(null);
      setIsLoading(false);
      throw err;
    }
  }, []);

  useEffect(() => {
    const stored = typeof window !== "undefined" ? localStorage.getItem("sentinel_token") : null;
    if (!stored) {
      setIsLoading(false);
      return;
    }
    setTokenState(stored);
    getMe()
      .then((userData) => {
        setUser(userData);
      })
      .catch(() => {
        logout();
      })
      .finally(() => setIsLoading(false));
  }, [logout]);

  return (
    <AuthContext.Provider value={{ user, token, isLoading, setToken: handleSetToken, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
