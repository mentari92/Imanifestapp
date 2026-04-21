import { Platform } from 'react-native';
import axios from 'axios';
import * as SecureStore from 'expo-secure-store';

function joinUrl(baseUrl: string, path: string): string {
  const base = baseUrl.endsWith('/') ? baseUrl.slice(0, -1) : baseUrl;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return `${base}${normalizedPath}`;
}

function getApiBaseUrl(): string {
  if (typeof process !== 'undefined' && process.env.EXPO_PUBLIC_API_URL) {
    return process.env.EXPO_PUBLIC_API_URL;
  }

  if (Platform.OS === 'web' && typeof window !== 'undefined') {
    const { hostname, protocol } = window.location;

    if (hostname.endsWith('imanifestapp.com')) {
      return `${protocol}//${hostname}/api`;
    }

    if (hostname === 'localhost' || hostname === '127.0.0.1') {
      return 'http://localhost:3001';
    }

    return `${protocol}//${hostname}:3001`;
  }

  return 'http://localhost:3001';
}

const API_BASE_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 120000,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use(async (config) => {
  try {
    let token: string | null = null;
    if (Platform.OS === 'web') {
      token = typeof localStorage !== 'undefined' ? localStorage.getItem('imanifest_jwt_token') : null;
    } else {
      token = await SecureStore.getItemAsync('imanifest_jwt_token');
    }

    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // non-critical token lookup failure
  }

  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    const message = error.response?.data?.message || 'Something went wrong. Try again.';
    return Promise.reject(new Error(message));
  },
);

export async function apiGet<T = any>(path: string, params?: Record<string, string>): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = new URL(joinUrl(baseUrl, path));
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, value);
    });
  }

  const token = await getAuthToken();

  const response = await fetch(url.toString(), {
    method: 'GET',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

export async function apiPost<T = any>(path: string, body?: any): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = joinUrl(baseUrl, path);
  const token = await getAuthToken();

  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

export async function apiPut<T = any>(path: string, body?: any): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = joinUrl(baseUrl, path);
  const token = await getAuthToken();

  const response = await fetch(url, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

export async function apiDelete<T = any>(path: string): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = joinUrl(baseUrl, path);
  const token = await getAuthToken();

  const response = await fetch(url, {
    method: 'DELETE',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

export async function apiPatch<T = any>(path: string, body?: any): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = joinUrl(baseUrl, path);
  const token = await getAuthToken();

  const response = await fetch(url, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ message: 'Request failed' }));
    throw new Error(error.message || `API Error: ${response.status}`);
  }

  return response.json();
}

async function getAuthToken(): Promise<string | null> {
  try {
    if (Platform.OS === 'web') {
      const localStorageToken =
        typeof localStorage !== 'undefined'
          ? localStorage.getItem('imanifest_jwt_token')
          : null;

      if (localStorageToken) return localStorageToken;
      return null;
    }

    const secureToken = await SecureStore.getItemAsync('imanifest_jwt_token');
    return secureToken || null;
  } catch {
    return null;
  }
}