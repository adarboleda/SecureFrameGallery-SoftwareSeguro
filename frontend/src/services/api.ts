import { env } from "@/config/env";
import { supabase } from "@/lib/supabase";

export const API_BASE_URL = env.NEXT_PUBLIC_API_URL;

/**
 * Cliente HTTP Base (Wrapper de fetch) para interactuar con FastAPI
 */
export async function apiFetch(endpoint: string, options: RequestInit = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  
  const headers = new Headers(options.headers || {});
  if (!headers.has("Content-Type") && !(options.body instanceof FormData)) {
    headers.set("Content-Type", "application/json");
  }

  if (!headers.has("Authorization")) {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (token) {
      headers.set("Authorization", `Bearer ${token}`);
    }
  }

  if (process.env.NODE_ENV !== 'production') {
    console.log(`[apiFetch] Intentando conectar a: ${url}`);
  }

  const response = await fetch(url, {
    ...options,
    headers,
  });

  const data = await response.json();

  if (!response.ok) {
    let errorMessage = data.detail || data.message || "Error en la solicitud a la API";
    if (Array.isArray(data.detail)) {
      errorMessage = data.detail.map((err: any) => err.msg).join(", ");
    }
    throw new Error(typeof errorMessage === "string" ? errorMessage : JSON.stringify(errorMessage));
  }

  return data;
}
