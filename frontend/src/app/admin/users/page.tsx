"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/services/api";

interface ManagedUser {
  id: string;
  email: string;
  username: string;
  role: "user" | "supervisor";
  is_suspended?: boolean;
  updating?: boolean;
}

export default function UserManagement() {
  const [users, setUsers] = useState<ManagedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [supervisorId, setSupervisorId] = useState<string | null>(null);
  const [supervisorEmail, setSupervisorEmail] = useState<string>("");
  const [search, setSearch] = useState("");
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }

      // Verify supervisor role
      const roleRes = await apiFetch(`/api/auth/role/${user.id}`);
      const { role } = roleRes;
      if (role !== "supervisor") { router.replace("/dashboard"); return; }

      setSupervisorId(user.id);
      setSupervisorEmail(user.email || "Supervisor");

      const data = await apiFetch(`/api/admin/users?supervisor_id=${user.id}`);
      setUsers(data.users || []);
      setLoading(false);
    }
    loadData();
  }, [router]);

  const toggleRole = async (targetUser: ManagedUser) => {
    if (!supervisorId) return;
    const newRole = targetUser.role === "supervisor" ? "user" : "supervisor";

    setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, updating: true } : u));

    try {
      await fetch(
        `http://localhost:8000/api/admin/users/${targetUser.id}/role?supervisor_id=${supervisorId}&new_role=${newRole}`,
        { method: "PATCH" }
      );
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, role: newRole as "user" | "supervisor", updating: false } : u));
    } catch (err) {
      console.error("Error actualizando rol", err);
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, updating: false } : u));
    }
  };

  const toggleSuspend = async (targetUser: ManagedUser) => {
    if (!supervisorId) return;
    const isCurrentlySuspended = targetUser.is_suspended;

    setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, updating: true } : u));

    try {
      await fetch(
        `http://localhost:8000/api/admin/users/${targetUser.id}/suspend?supervisor_id=${supervisorId}&suspend=${!isCurrentlySuspended}`,
        { method: "POST" }
      );
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, is_suspended: !isCurrentlySuspended, updating: false } : u));
    } catch (err) {
      console.error("Error al suspender/reactivar usuario", err);
      setUsers(prev => prev.map(u => u.id === targetUser.id ? { ...u, updating: false } : u));
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  const filtered = users.filter(u =>
    u.email.toLowerCase().includes(search.toLowerCase()) ||
    u.username.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md antialiased">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.07)]">
        <div className="flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <Link href="/supervisor">
              <button className="flex items-center gap-2 text-zinc-500 hover:text-zinc-900 transition-colors cursor-pointer">
                <span className="material-symbols-outlined">arrow_back</span>
              </button>
            </Link>
            <span className="material-symbols-outlined text-[#E60023]" style={{fontVariationSettings: "'FILL' 1"}}>manage_accounts</span>
            <span className="text-[#E60023] font-bold text-xl tracking-tighter">Administración de Usuarios</span>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-zinc-100 transition-colors text-zinc-600 font-label-md text-label-md cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">home</span>
              Galería Pública
            </Link>
            <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-full px-4 py-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">person</span>
              <span className="font-label-md text-label-md text-secondary truncate max-w-[180px]">{supervisorEmail}</span>
            </div>
            <button onClick={handleLogout} className="h-10 w-10 rounded-full bg-surface-variant flex items-center justify-center hover:bg-red-50 text-on-surface hover:text-red-500 transition-colors duration-200 cursor-pointer" title="Cerrar sesión">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
      </header>

      <main className="pt-24 pb-16 px-6 max-w-7xl mx-auto">
        <section className="mb-8">
          <h1 className="font-display-lg text-display-lg text-on-background mb-1">Gestión de Usuarios</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Asigna o revoca el rol de supervisor a cualquier usuario registrado.</p>
        </section>

        {/* Stats */}
        <section className="grid grid-cols-2 gap-4 mb-8">
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)]">
            <p className="font-headline-lg text-headline-lg text-on-surface">{users.length}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Total de usuarios</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)]">
            <p className="font-headline-lg text-headline-lg text-on-surface">{users.filter(u => u.role === "supervisor").length}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Supervisores activos</p>
          </div>
        </section>

        {/* Search */}
        <div className="mb-6 relative">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 material-symbols-outlined text-secondary text-[20px]">search</span>
          <input
            type="text"
            placeholder="Buscar por correo o nombre de usuario..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-12 pr-4 py-3.5 bg-surface-container-lowest rounded-2xl border border-outline-variant focus:outline-none focus:ring-2 focus:ring-primary-container font-body-md text-body-md"
          />
        </div>

        {/* Users Table */}
        {loading ? (
          <div className="flex justify-center p-20">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
          </div>
        ) : filtered.length === 0 ? (
          <div className="py-20 text-center border-2 border-dashed border-outline-variant rounded-3xl text-secondary">
            <span className="material-symbols-outlined text-5xl mb-3 block">person_search</span>
            <p className="font-body-lg">No se encontraron usuarios.</p>
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {filtered.map(user => (
              <div key={user.id} className="bg-surface-container-lowest rounded-2xl p-5 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] flex flex-col md:flex-row md:items-center gap-4">
                {/* Avatar */}
                <div className={`h-12 w-12 rounded-full flex items-center justify-center shrink-0 ${
                  user.role === "supervisor" ? "bg-[#E60023]/10" : "bg-secondary-fixed"
                }`}>
                  <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1", color: user.role === "supervisor" ? "#E60023" : undefined}}>
                    {user.role === "supervisor" ? "admin_panel_settings" : "person"}
                  </span>
                </div>
                {/* Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-headline-sm text-headline-sm text-on-surface truncate">{user.email}</p>
                    <span className={`px-2.5 py-0.5 rounded-full font-label-sm text-label-sm ${
                      user.role === "supervisor"
                        ? "bg-[#E60023]/10 text-[#E60023]"
                        : "bg-secondary-fixed text-secondary"
                    }`}>
                      {user.role === "supervisor" ? "Supervisor" : "Usuario"}
                    </span>
                    {user.is_suspended && (
                      <span className="px-2.5 py-0.5 rounded-full font-label-sm text-label-sm bg-red-100 text-red-800 flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">lock</span>
                        Suspendido
                      </span>
                    )}
                  </div>
                  {user.username && (
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">@{user.username}</p>
                  )}
                  <p className="font-label-sm text-label-sm text-secondary mt-1 font-mono">{user.id.substring(0, 20)}…</p>
                </div>
                {/* Action */}
                {user.id !== supervisorId && (
                  <div className="shrink-0 flex items-center gap-2">
                    {user.role === "user" && (
                      <button
                        onClick={() => toggleSuspend(user)}
                        disabled={user.updating}
                        className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-label-md text-label-md transition-colors cursor-pointer disabled:opacity-50 ${
                          user.is_suspended
                            ? "bg-green-600 text-white hover:bg-green-700"
                            : "bg-surface-container text-on-surface hover:bg-red-50 hover:text-red-600"
                        }`}
                      >
                        {user.updating
                          ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                          : <span className="material-symbols-outlined text-[18px]">{user.is_suspended ? "lock_open" : "lock"}</span>
                        }
                        {user.is_suspended ? "Reactivar" : "Suspender"}
                      </button>
                    )}
                    <button
                      onClick={() => toggleRole(user)}
                      disabled={user.updating || user.is_suspended}
                      className={`flex items-center gap-2 px-5 py-2.5 rounded-full font-label-md text-label-md transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed ${
                        user.role === "supervisor"
                          ? "bg-surface-container text-on-surface hover:bg-red-50 hover:text-red-600"
                          : "bg-[#E60023] text-white hover:bg-[#cc0020]"
                      }`}
                    >
                      {user.updating
                        ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span>
                        : <span className="material-symbols-outlined text-[18px]">{user.role === "supervisor" ? "person_remove" : "admin_panel_settings"}</span>
                      }
                      {user.role === "supervisor" ? "Quitar supervisor" : "Hacer supervisor"}
                    </button>
                  </div>
                )}
                {user.id === supervisorId && (
                  <span className="shrink-0 px-5 py-2.5 rounded-full font-label-md text-label-md bg-secondary-fixed text-secondary">
                    Tú
                  </span>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
