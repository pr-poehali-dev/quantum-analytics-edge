import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { api } from "@/lib/api";

interface User {
  id: number;
  email: string;
  artist_name: string;
  role: "artist" | "admin";
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ error?: string; role?: string }>;
  register: (email: string, password: string, artistName: string) => Promise<{ error?: string; role?: string }>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("ks_token");
    if (!token) { setLoading(false); return; }

    const timeout = setTimeout(() => {
      localStorage.removeItem("ks_token");
      setLoading(false);
    }, 5000);

    api.auth.me().then((res) => {
      if (res.user) setUser(res.user);
      else localStorage.removeItem("ks_token");
    }).catch(() => {
      localStorage.removeItem("ks_token");
    }).finally(() => {
      clearTimeout(timeout);
      setLoading(false);
    });
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const res = await api.auth.login({ email, password });
      if (res.error) return { error: res.error };
      if (!res.token) return { error: "Нет ответа от сервера, попробуй позже" };
      localStorage.setItem("ks_token", res.token);
      setUser(res.user);
      return { role: res.user?.role };
    } catch {
      return { error: "Ошибка соединения, попробуй позже" };
    }
  };

  const register = async (email: string, password: string, artistName: string) => {
    try {
      const res = await api.auth.register({ email, password, artist_name: artistName });
      if (res.error) return { error: res.error };
      if (!res.token) return { error: "Нет ответа от сервера, попробуй позже" };
      localStorage.setItem("ks_token", res.token);
      setUser(res.user);
      return { role: res.user?.role };
    } catch {
      return { error: "Ошибка соединения, попробуй позже" };
    }
  };

  const logout = () => {
    api.auth.logout();
    localStorage.removeItem("ks_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}