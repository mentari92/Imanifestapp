import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { api } from "./api";

interface User {
  id: string;
  email: string;
  name: string;
}

const DEMO_AUTH_MODE =
  typeof process !== "undefined" &&
  process.env.EXPO_PUBLIC_DEMO_AUTH_MODE === "true";

const DEMO_USER: User = {
  id: "demo-user-hackathon",
  email: "demo@imanifestapp.com",
  name: "Hackathon Jury",
};

const DEMO_TOKEN = "demo-auth-disabled-token";

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
      try {
        if (DEMO_AUTH_MODE) {
          setToken(DEMO_TOKEN);
          setUser(DEMO_USER);
          return;
        }

        const savedToken = await storageGet(TOKEN_KEY);
        const savedUser = await storageGet(USER_KEY);
        if (savedToken && savedUser) {
          try {
            setToken(savedToken);
            setUser(JSON.parse(savedUser));
          } catch {
            // Corrupted persisted user payload should not block app boot.
            await storageDelete(TOKEN_KEY);
            await storageDelete(USER_KEY);
            setToken(null);
            setUser(null);
          }
        }
      } catch (err) {
        // Some older browsers/private mode can fail storage access.
        console.warn("Auth bootstrap failed, continuing as signed-out", err);
        setToken(null);
        setUser(null);
      } finally {
        setLoading(false);
      }
    }
    loadSavedAuth();
  }, []);

  async function login(email: string, password: string) {
    try {
      const res = await api.post("/auth/login", { email, password });
      const { access_token, user: userData } = res.data;
      await saveAuth(access_token, userData);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Login failed";
      throw new Error(message);
    }
  }

  async function register(email: string, password: string, name?: string) {
    try {
      const res = await api.post("/auth/register", { email, password, name });
      const { access_token, user: userData } = res.data;
      await saveAuth(access_token, userData);
    } catch (err: any) {
      const message = err?.response?.data?.message || err?.message || "Registration failed";
      throw new Error(message);
    }
  }

  async function logout() {
    const activeToken = token ?? (await storageGet(TOKEN_KEY));

    if (activeToken) {
      try {
        await api.post(
          "/auth/logout",
          {},
          {
            headers: {
              Authorization: `Bearer ${activeToken}`,
            },
          },
        );
      } catch (err: any) {
        // Client state must still be cleared even if revoke fails.
        console.warn("Logout revoke request failed", err?.message || err);
      }
    }

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