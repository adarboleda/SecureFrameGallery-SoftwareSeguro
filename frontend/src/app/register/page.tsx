'use client';

import Link from 'next/link';
import { useState } from 'react';

import { registerSchema } from '@/schemas/auth.schema';
import { apiFetch } from '@/services/api';

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setFieldErrors({});

    // RF01: Validación de política de contraseñas robustas (Zod)
    const validation = registerSchema.safeParse({ username, email, password, confirmPassword });
    if (!validation.success) {
      const errors: Record<string, string> = {};
      validation.error.issues.forEach((err) => {
        const field = err.path[0] as string;
        if (!errors[field]) errors[field] = err.message;
      });
      setFieldErrors(errors);
      return;
    }

    setLoading(true);

    try {
      await apiFetch('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({
          email,
          password,
          username,
        }),
      });

      window.location.href = '/login?registered=true';
    } catch (err: any) {
      setError('No se pudo registrar la cuenta. Verifica tus datos e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center p-6 antialiased">
      {/* Main Registration Card */}
      <main className="bg-surface-container-lowest w-full max-w-[480px] rounded-xl shadow-[0_8px_40px_-12px_rgba(0,0,0,0.08)] p-8 md:p-12 flex flex-col items-center">
        {/* Brand / Icon */}
        <div className="w-16 h-16 bg-primary-container rounded-full flex items-center justify-center mb-6 shadow-[0_4px_20px_-4px_rgba(230,0,35,0.4)]">
          <span
            className="material-symbols-outlined text-on-primary-container text-4xl"
            style={{ fontVariationSettings: "'FILL' 1" }}
          >
            temp_preferences_custom
          </span>
        </div>

        {/* Headlines */}
        <h1 className="font-display-lg text-display-lg text-on-background text-center tracking-tight mb-2">
          Bienvenido
        </h1>
        <p className="font-body-lg text-body-lg text-on-surface-variant text-center mb-8">
          Encuentra nuevas ideas para intentar
        </p>

        {/* Form Elements */}
        <form className="w-full flex flex-col gap-md" onSubmit={handleRegister}>
          <div className="relative">
            <input
              className="w-full bg-secondary-fixed text-on-background font-body-lg text-body-lg rounded-full px-lg py-[18px] border-none focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest outline-none transition-all duration-200 placeholder:text-on-secondary-container/70"
              id="username"
              placeholder="Nombre de usuario"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {fieldErrors.username && <p className="text-red-500 text-xs mt-1 px-4">{fieldErrors.username}</p>}
          </div>
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
            {fieldErrors.email && <p className="text-red-500 text-xs mt-1 px-4">{fieldErrors.email}</p>}
          </div>
          <div className="relative">
            <input
              className="w-full bg-secondary-fixed text-on-background font-body-lg text-body-lg rounded-full px-lg py-[18px] border-none focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest outline-none transition-all duration-200 placeholder:text-on-secondary-container/70"
              id="password"
              placeholder="Contraseña"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            {fieldErrors.password && <p className="text-red-500 text-xs mt-1 px-4">{fieldErrors.password}</p>}
            <p className="text-xs text-secondary mt-1 px-4">La política completa se valida en el servidor.</p>
          </div>
          <div className="relative">
            <input
              className="w-full bg-secondary-fixed text-on-background font-body-lg text-body-lg rounded-full px-lg py-[18px] border-none focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest outline-none transition-all duration-200 placeholder:text-on-secondary-container/70"
              id="confirm_password"
              placeholder="Confirmar Contraseña"
              type="password"
              required
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
            {fieldErrors.confirmPassword && <p className="text-red-500 text-xs mt-1 px-4">{fieldErrors.confirmPassword}</p>}
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
            {loading ? 'Creando...' : 'Crear Cuenta'}
          </button>
        </form>
        <div className="mt-xl">
          <Link
            href="/login"
            className="font-label-md text-label-md text-on-background hover:text-primary-container transition-colors font-bold cursor-pointer"
          >
            ¿Ya eres miembro? Inicia sesión
          </Link>
        </div>
      </main>
    </div>
  );
}
