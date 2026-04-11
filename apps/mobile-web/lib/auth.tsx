import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { api } from "./api";

interface User {
  id: string;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name?: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

const TOKEN_KEY = "imanifest_jwt_token";
const USER_KEY = "imanifest_user";

// Web falls back to localStorage since SecureStore is native-only
async function storageGet(key: string): Promise<string | null> {
  if (Platform.OS === "web") {
    return typeof localStorage !== "undefined" ? localStorage.getItem(key) : null;
  }
  return SecureStore.getItemAsync(key);
}

async function storageSet(key: string, value: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.setItem(key, value);
    return;
  }
  await SecureStore.setItemAsync(key, value);
}

async function storageDelete(key: string): Promise<void> {
  if (Platform.OS === "web") {
    if (typeof localStorage !== "undefined") localStorage.removeItem(key);
    return;
  }
  await SecureStore.deleteItemAsync(key);
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Load saved token on mount
  useEffect(() => {
    async function loadSavedAuth() {
      const savedToken = await storageGet(TOKEN_KEY);
      const savedUser = await storageGet(USER_KEY);
      if (savedToken && savedUser) {
        setToken(savedToken);
        setUser(JSON.parse(savedUser));
      }
      setLoading(false);
    }
    loadSavedAuth();
  }, []);

  async function login(email: string, password: string) {
    const res = await api.post("/auth/login", { email, password });
    const { access_token, user: userData } = res.data;
    await saveAuth(access_token, userData);
  }

  async function register(email: string, password: string, name?: string) {
    const res = await api.post("/auth/register", { email, password, name });
    const { access_token, user: userData } = res.data;
    await saveAuth(access_token, userData);
  }

  async function logout() {
    await storageDelete(TOKEN_KEY);
    await storageDelete(USER_KEY);
    setToken(null);
    setUser(null);
  }

  async function saveAuth(accessToken: string, userData: User) {
    await storageSet(TOKEN_KEY, accessToken);
    await storageSet(USER_KEY, JSON.stringify(userData));
    setToken(accessToken);
    setUser(userData);
  }

  return (
    <AuthContext.Provider value={{ user, token, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}