'use client';

import Link from 'next/link';
import { useState } from 'react';

import { registerSchema } from '@/schemas/auth.schema';
import { apiFetch } from '@/services/api';

/** Checks each password rule independently so we can show live feedback */
const passwordRules = [
  { id: 'length',  label: 'Al menos 8 caracteres',          test: (v: string) => v.length >= 8 },
  { id: 'upper',   label: 'Una letra mayúscula (A-Z)',       test: (v: string) => /[A-Z]/.test(v) },
  { id: 'lower',   label: 'Una letra minúscula (a-z)',       test: (v: string) => /[a-z]/.test(v) },
  { id: 'number',  label: 'Un número (0-9)',                 test: (v: string) => /[0-9]/.test(v) },
  { id: 'special', label: 'Un carácter especial (!@#$%...)', test: (v: string) => /[^A-Za-z0-9]/.test(v) },
];

export default function Register() {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);

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
      // Show the real server error if available
      setError(err.message || 'No se pudo registrar la cuenta. Verifica tus datos e inténtalo de nuevo.');
    } finally {
      setLoading(false);
    }
  };

  const inputBase =
    'w-full bg-secondary-fixed text-on-background font-body-lg text-body-lg rounded-full px-lg py-[18px] pr-14 border-none focus:ring-2 focus:ring-primary-container focus:bg-surface-container-lowest outline-none transition-all duration-200 placeholder:text-on-secondary-container/70';

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
          Crea tu cuenta para comenzar
        </p>

        {/* Form Elements */}
        <form className="w-full flex flex-col gap-md" onSubmit={handleRegister}>

          {/* Username */}
          <div className="relative">
            <input
              className={inputBase.replace('pr-14', 'pr-4')}
              id="username"
              placeholder="Nombre de usuario"
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
            {fieldErrors.username && (
              <p className="text-red-500 text-xs mt-1 px-4">{fieldErrors.username}</p>
            )}
          </div>

          {/* Email */}
          <div className="relative">
            <input
              className={inputBase.replace('pr-14', 'pr-4')}
              id="email"
              placeholder="Correo electrónico"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            {fieldErrors.email && (
              <p className="text-red-500 text-xs mt-1 px-4">{fieldErrors.email}</p>
            )}
          </div>

          {/* Password */}
          <div className="relative">
            <div className="relative">
              <input
                className={inputBase}
                id="password"
                placeholder="Contraseña"
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onFocus={() => setPasswordFocused(true)}
                onBlur={() => setPasswordFocused(false)}
              />
              <button
                type="button"
                aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-background transition-colors"
              >
                <span className="material-symbols-outlined text-xl select-none">
                  {showPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>

            {fieldErrors.password && (
              <p className="text-red-500 text-xs mt-1 px-4">{fieldErrors.password}</p>
            )}

            {/* Password requirements checklist — shown when field is focused OR has content */}
            {(passwordFocused || password.length > 0) && (
              <ul className="mt-2 px-4 flex flex-col gap-1">
                {passwordRules.map((rule) => {
                  const ok = rule.test(password);
                  return (
                    <li key={rule.id} className={`flex items-center gap-1.5 text-xs transition-colors ${ok ? 'text-green-600' : 'text-on-surface-variant'}`}>
                      <span className="material-symbols-outlined text-sm" style={{ fontVariationSettings: "'FILL' 1" }}>
                        {ok ? 'check_circle' : 'radio_button_unchecked'}
                      </span>
                      {rule.label}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          {/* Confirm Password */}
          <div className="relative">
            <div className="relative">
              <input
                className={inputBase}
                id="confirm_password"
                placeholder="Confirmar contraseña"
                type={showConfirmPassword ? 'text' : 'password'}
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
              />
              <button
                type="button"
                aria-label={showConfirmPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                onClick={() => setShowConfirmPassword((v) => !v)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-on-surface-variant hover:text-on-background transition-colors"
              >
                <span className="material-symbols-outlined text-xl select-none">
                  {showConfirmPassword ? 'visibility_off' : 'visibility'}
                </span>
              </button>
            </div>
            {fieldErrors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1 px-4">{fieldErrors.confirmPassword}</p>
            )}
          </div>

          {/* General / server error */}
          {error && (
            <div className="flex items-start gap-2 bg-red-50 border border-red-200 rounded-xl px-4 py-3">
              <span className="material-symbols-outlined text-red-500 text-base mt-0.5">error</span>
              <p className="text-red-600 text-sm">{error}</p>
            </div>
          )}

          {/* Submit Button */}
          <button
            className="w-full bg-primary-container text-on-primary-container font-headline-sm text-headline-sm rounded-full py-[16px] mt-md hover:bg-primary active:scale-[0.98] transition-all duration-200 shadow-sm cursor-pointer disabled:opacity-50"
            type="submit"
            disabled={loading}
          >
            {loading ? 'Creando cuenta...' : 'Crear Cuenta'}
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
