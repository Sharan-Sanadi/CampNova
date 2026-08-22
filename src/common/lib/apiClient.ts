const API_BASE_URL = typeof window !== "undefined"
  ? (import.meta.env["VITE_API_URL"] || "http://localhost:3001/api/v1")
  : "http://localhost:3001/api/v1";

let clerkTokenGetter: (() => Promise<string | null>) | null = null;

export function setClerkTokenGetter(fn: (() => Promise<string | null>) | null) {
  clerkTokenGetter = fn;
}

export async function fetchApi<T>(endpoint: string, options?: RequestInit): Promise<T | null> {
  try {
    let token: string | null = null;
    if (clerkTokenGetter) {
      try {
        token = await clerkTokenGetter();
      } catch (err) {
        console.warn("[API] Failed to get token from getter:", err);
      }
    }
    
    if (!token && typeof window !== "undefined" && (window as any).Clerk?.session) {
      try {
        token = await (window as any).Clerk.session.getToken();
      } catch (err) {
        console.warn("[API] Failed to get Clerk session token:", err);
      }
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options?.headers as Record<string, string>),
    };

    const url = `${API_BASE_URL}${endpoint.startsWith("/") ? endpoint : `/${endpoint}`}`;
    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      console.warn(`[API] Fetch failed for ${endpoint}: ${res.status} ${res.statusText}`);
      return null;
    }

    const data = await res.json();
    return data as T;
  } catch (err) {
    console.error(`[API Network Error] ${endpoint}:`, err);
    return null;
  }
}
