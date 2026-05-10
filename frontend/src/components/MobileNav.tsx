'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { apiFetch } from '@/services/api';

export default function MobileNav() {
  const pathname = usePathname();
  const [role, setRole] = useState<'guest' | 'user' | 'supervisor'>('guest');
  const [loading, setLoading] = useState(true);

  // Ocultar el menú inferior en páginas de auth
  if (pathname === '/login' || pathname === '/register') return null;

  useEffect(() => {
    async function loadRole() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        setRole('guest');
        setLoading(false);
        return;
      }
      try {
        const roleRes = await apiFetch(`/api/auth/role/${user.id}`);
        setRole(roleRes?.role || 'user');
      } catch {
        setRole('user');
      }
      setLoading(false);
    }
    loadRole();
  }, [pathname]);

  if (loading) return null;

  // RUTAS PARA SUPERVISOR
  if (role === 'supervisor') {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-white/95 backdrop-blur-lg border-t border-zinc-200">
        <div className="flex justify-around items-center w-full h-16 px-1">
          <Link href="/" className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${pathname === '/' ? 'text-[#E60023]' : 'text-zinc-400'}`}>
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: pathname === '/' ? "'FILL' 1" : "'FILL' 0" }}>home</span>
            <span className="text-[10px] font-medium leading-none">Inicio</span>
          </Link>
          <Link href="/supervisor" className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${pathname === '/supervisor' ? 'text-[#E60023]' : 'text-zinc-400'}`}>
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: pathname === '/supervisor' ? "'FILL' 1" : "'FILL' 0" }}>photo_library</span>
            <span className="text-[10px] font-medium leading-none">Panel Sup.</span>
          </Link>
          <Link href="/quarantine" className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${pathname === '/quarantine' ? 'text-[#E60023]' : 'text-zinc-400'}`}>
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: pathname === '/quarantine' ? "'FILL' 1" : "'FILL' 0" }}>security</span>
            <span className="text-[10px] font-medium leading-none">Cuarentena</span>
          </Link>
          <Link href="/admin/users" className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${pathname.startsWith('/admin') ? 'text-[#E60023]' : 'text-zinc-400'}`}>
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: pathname.startsWith('/admin') ? "'FILL' 1" : "'FILL' 0" }}>manage_accounts</span>
            <span className="text-[10px] font-medium leading-none">Usuarios</span>
          </Link>
        </div>
      </nav>
    );
  }

  // RUTAS PARA USUARIO REGISTRADO
  if (role === 'user') {
    return (
      <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-white/95 backdrop-blur-lg border-t border-zinc-200">
        <div className="flex justify-around items-center w-full h-16 px-1">
          <Link href="/" className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${pathname === '/' ? 'text-[#E60023]' : 'text-zinc-400'}`}>
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: pathname === '/' ? "'FILL' 1" : "'FILL' 0" }}>home</span>
            <span className="text-[10px] font-medium leading-none">Inicio</span>
          </Link>
          <Link href="/dashboard" className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${pathname === '/dashboard' ? 'text-[#E60023]' : 'text-zinc-400'}`}>
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: pathname === '/dashboard' ? "'FILL' 1" : "'FILL' 0" }}>dashboard</span>
            <span className="text-[10px] font-medium leading-none">Panel</span>
          </Link>
          <Link href="/albums/new" className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${pathname === '/albums/new' ? 'text-[#E60023]' : 'text-zinc-400'}`}>
            <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: pathname === '/albums/new' ? "'FILL' 1" : "'FILL' 0" }}>add_box</span>
            <span className="text-[10px] font-medium leading-none">Nuevo</span>
          </Link>
        </div>
      </nav>
    );
  }

  // RUTAS PARA INVITADOS (GUEST)
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-[100] md:hidden bg-white/95 backdrop-blur-lg border-t border-zinc-200">
      <div className="flex justify-around items-center w-full h-16 px-1">
        <Link href="/" className={`flex-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer ${pathname === '/' ? 'text-[#E60023]' : 'text-zinc-400'}`}>
          <span className="material-symbols-outlined text-[24px]" style={{ fontVariationSettings: pathname === '/' ? "'FILL' 1" : "'FILL' 0" }}>home</span>
          <span className="text-[10px] font-medium leading-none">Inicio</span>
        </Link>
        <Link href="/login" className="flex-1 flex flex-col items-center justify-center gap-1 transition-all cursor-pointer text-zinc-400 hover:text-[#E60023]">
          <span className="material-symbols-outlined text-[24px]">login</span>
          <span className="text-[10px] font-medium leading-none">Ingresar</span>
        </Link>
      </div>
    </nav>
  );
}
