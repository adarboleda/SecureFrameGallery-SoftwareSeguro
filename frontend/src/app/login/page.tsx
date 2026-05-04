'use client';

import Link from 'next/link';
import { useState } from 'react';

import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/services/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const data = await apiFetch('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });

      const access_token = data.access_token;
      const refresh_token = data.refresh_token;
      if (!access_token || !refresh_token) {
        throw new Error('Credenciales inválidas.');
      }

      await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      const userId = data.user_id;
      if (!userId)
        throw new Error('Credenciales inválidas.');

      // Consultar el rol del usuario al backend
      const roleRes = await fetch(
        `http://localhost:8000/api/auth/role/${userId}`,
      );
      const roleData = await roleRes.json();

      // Redirigir según el rol
      if (roleData.role === 'supervisor') {
        window.location.href = '/supervisor';
      } else {
        window.location.href = '/dashboard';
      }
    } catch (err: any) {
      setError('Credenciales inválidas o cuenta bloqueada temporalmente.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center p-container-margin antialiased">
      <main className="w-full max-w-[480px] bg-surface-container-lowest rounded-lg p-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] flex flex-col items-center">
        {/* Brand Icon */}
        <div className="w-16 h-16 bg-primary-container text-on-primary-container rounded-full flex items-center justify-center mb-lg">
          <span
            className="material-symbols-outlined text-display-lg"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            favorite
          </span>
        </div>

        <h1 className="font-display-lg text-display-lg text-on-background text-center tracking-tight mb-2">
          Bienvenido
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant text-center mb-8">
          Encuentra nuevas ideas para intentar
        </p>

        {/* Form Elements */}
        <form className="w-full flex flex-col gap-md" onSubmit={handleLogin}>
          <div className="relative">
            <input
              className="w-full bg-secondary-fixed text-on-background font-body-lg text-body-lg rounded-full px-lg py-[18px] border-none focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest outline-none transition-all duration-200 placeholder:text-on-secondary-container/70"
              id="email"
              placeholder="Correo electrónico"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="relative w-full">
            <input
              className="w-full bg-secondary-fixed text-on-background font-body-lg text-body-lg rounded-full px-lg py-[18px] border-none focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest outline-none transition-all duration-200 placeholder:text-on-secondary-container/70"
              id="password"
              placeholder="Contraseña"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>

          {error && (
            <p className="text-red-500 text-sm font-label-md px-2">{error}</p>
          )}

          {/* Submit Button */}
          <button
            className="w-full bg-primary-container text-on-primary-container font-headline-sm text-headline-sm rounded-full py-[16px] mt-md hover:bg-primary active:scale-[0.98] transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Iniciando...' : 'Iniciar sesión'}
          </button>
        </form>

        <div className="mt-xl">
          <Link
            href="/register"
            className="font-label-md text-label-md text-on-background hover:text-primary-container transition-colors font-bold cursor-pointer"
          >
            ¿Aún no estás en SecureFrame? Regístrate
          </Link>
        </div>
      </main>
    </div>
  );
}
