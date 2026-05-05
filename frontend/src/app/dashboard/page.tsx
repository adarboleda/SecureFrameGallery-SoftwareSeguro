"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { albumService } from "@/services/album.service";

import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Album {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  privacy?: string;
  preview_url?: string | null;
}

export default function Dashboard() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Usuario");
  const [updatingPrivacyId, setUpdatingPrivacyId] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      
      // Verificar rol: si es supervisor redirigir al panel correcto
      const roleRes = await fetch(`http://localhost:8000/api/auth/role/${user.id}`);
      if (roleRes.ok) {
        const { role } = await roleRes.json();
        if (role === "supervisor") {
          router.replace("/supervisor");
          return;
        }
      }
      
      setUserId(user.id);
      setUserName(user.user_metadata?.username || user.email?.split("@")[0] || "Usuario");
    }
    loadUser();
  }, [router]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  useEffect(() => {
    async function loadAlbums() {
      if (!userId) return;
      try {
        const albumsData = await albumService.getMyAlbums(userId);
        const rawAlbums: Album[] = albumsData || [];

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const enriched = await Promise.all(
          rawAlbums.map(async (album) => {
            try {
              const res = await fetch(
                `http://localhost:8000/api/public/albums/${album.id}/my-files?user_id=${userId}`,
                {
                  headers: token ? { Authorization: `Bearer ${token}` } : undefined,
                }
              );
              if (!res.ok) return { ...album, preview_url: null };
              const json = await res.json();
              const files = (json.files || []).filter((file: any) => file.type === "image");
              const clean = files.find((file: any) => file.status === "clean");
              return { ...album, preview_url: (clean || files[0])?.url || null };
            } catch {
              return { ...album, preview_url: null };
            }
          })
        );

        setAlbums(enriched);
      } catch (err) {
        console.error("Error al cargar álbumes", err);
      } finally {
        setLoading(false);
      }
    }
    loadAlbums();
  }, [userId]);

  const stats = {
    total: albums.length,
    approved: albums.filter(a => a.status === 'approved').length,
    pending: albums.filter(a => a.status === 'pending').length,
  };

  return (
    <div className="bg-background text-on-background min-h-screen pb-24 md:pb-0 pt-20">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto">
          <Link href="/">
            <button className="text-zinc-900 hover:bg-zinc-100 transition-colors duration-200 p-2 rounded-full active:scale-95 cursor-pointer">
              <span className="material-symbols-outlined">potted_plant</span>
            </button>
          </Link>
          <h1 className="text-[#E60023] font-bold text-2xl tracking-tighter antialiased">SecureFrame</h1>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-full px-4 py-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">person</span>
              <span className="font-label-md text-label-md text-secondary truncate max-w-[180px]">{userName}</span>
            </div>
            <button onClick={handleLogout} className="h-10 w-10 rounded-full bg-surface-variant overflow-hidden flex items-center justify-center hover:bg-red-50 text-on-surface hover:text-red-500 transition-colors duration-200 cursor-pointer" title="Cerrar sesión">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
        </div>
        {/* Desktop Navigation */}
        <nav className="hidden md:flex justify-center gap-8 py-3 border-t border-zinc-100">
          <Link href="/">
            <div className="flex flex-col items-center gap-1 text-zinc-500 hover:bg-zinc-100 transition-colors duration-200 px-4 py-2 rounded-xl cursor-pointer">
              <span className="material-symbols-outlined">home</span>
              <span className="font-label-md text-label-md">Inicio</span>
            </div>
          </Link>
          <Link href="/dashboard">
            <div className="flex flex-col items-center gap-1 text-zinc-900 hover:bg-zinc-100 transition-colors duration-200 px-4 py-2 rounded-xl cursor-pointer">
              <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
              <span className="font-label-md text-label-md">Perfil</span>
            </div>
          </Link>
          <Link href="/albums/new">
            <div className="flex flex-col items-center gap-1 text-zinc-500 hover:bg-zinc-100 transition-colors duration-200 px-4 py-2 rounded-xl cursor-pointer">
              <span className="material-symbols-outlined">add</span>
              <span className="font-label-md text-label-md">Nuevo Álbum</span>
            </div>
          </Link>
        </nav>
      </header>

      {/* Main Content Canvas */}
      <main className="max-w-7xl mx-auto px-container-margin py-lg mt-8">
        {/* Welcome Section */}
        <section className="mb-xl text-center md:text-left">
          <h2 className="font-display-lg text-display-lg text-on-surface mb-2">Bienvenido de vuelta, {userName}</h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Aquí tienes un resumen de tu portafolio creativo.</p>
        </section>

        {/* Stats Bento Grid */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-grid-gutter mb-xl">
          <div className="bg-surface-container-lowest rounded-lg p-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center md:items-start">
            <span className="material-symbols-outlined text-primary-container mb-md text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>photo_library</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">{stats.total}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">Total de Álbumes</p>
          </div>
          <div className="bg-surface-container-lowest rounded-lg p-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center md:items-start">
            <span className="material-symbols-outlined text-tertiary-container mb-md text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>check_circle</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">{stats.approved}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">Aprobados</p>
          </div>
          <div className="bg-surface-container-lowest rounded-lg p-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center md:items-start">
            <span className="material-symbols-outlined text-secondary mb-md text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>pending</span>
            <h3 className="font-headline-md text-headline-md text-on-surface">{stats.pending}</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">Pendientes</p>
          </div>
        </section>

        {/* Recent Albums Section */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">Álbumes Recientes</h2>
            <Link href="/albums/new" className="font-label-md text-label-md text-primary-container hover:underline cursor-pointer">
              Crear Nuevo
            </Link>
          </div>
          
          {loading ? (
            <div className="flex justify-center p-20"><span className="material-symbols-outlined animate-spin">refresh</span></div>
          ) : albums.length === 0 ? (
            <div className="text-center py-20 text-on-surface-variant border border-dashed border-outline-variant rounded-xl">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">folder_open</span>
              <p>Aún no tienes ningún álbum.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {albums.map((album) => (
                <div key={album.id} className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0_4px_20px_-5px_rgba(0,0,0,0.07)] group relative border border-transparent hover:border-primary-container/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.1)]">
                  <div className="absolute top-4 right-4 z-20 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1.5 shadow-sm">
                      <span className={`w-2 h-2 rounded-full ${
                        album.status === 'approved' ? 'bg-green-500' :
                        album.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'
                      }`}></span>
                      <span className="font-label-sm text-label-sm text-zinc-800">
                        {album.status === 'approved' ? 'Aprobado' : album.status === 'pending' ? 'Pendiente' : 'Rechazado'}
                      </span>
                    </div>
                  <div className="absolute top-4 left-4 z-20">
                    <div className="bg-white/90 backdrop-blur-sm p-1 rounded-full shadow-sm flex items-center gap-1">
                      <button
                        type="button"
                        onClick={async (event) => {
                          event.stopPropagation();
                          event.preventDefault();
                          if (updatingPrivacyId || album.privacy === "public") return;
                          try {
                            setUpdatingPrivacyId(album.id);
                            await albumService.updateAlbumPrivacy(album.id, "public");
                            setAlbums((prev) => prev.map((item) => item.id === album.id ? { ...item, privacy: "public" } : item));
                          } catch (err) {
                            console.error("Error al actualizar privacidad", err);
                          } finally {
                            setUpdatingPrivacyId(null);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${album.privacy === "public" ? "bg-[#E60023] text-white" : "text-zinc-700 hover:bg-white"}`}
                      >
                        <span className="material-symbols-outlined text-[14px]">public</span>
                        Público
                      </button>
                      <button
                        type="button"
                        onClick={async (event) => {
                          event.stopPropagation();
                          event.preventDefault();
                          if (updatingPrivacyId || album.privacy === "private") return;
                          try {
                            setUpdatingPrivacyId(album.id);
                            await albumService.updateAlbumPrivacy(album.id, "private");
                            setAlbums((prev) => prev.map((item) => item.id === album.id ? { ...item, privacy: "private" } : item));
                          } catch (err) {
                            console.error("Error al actualizar privacidad", err);
                          } finally {
                            setUpdatingPrivacyId(null);
                          }
                        }}
                        className={`px-3 py-1 rounded-full text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${album.privacy === "private" ? "bg-[#E60023] text-white" : "text-zinc-700 hover:bg-white"}`}
                      >
                        <span className="material-symbols-outlined text-[14px]">lock</span>
                        Privado
                      </button>
                    </div>
                  </div>
                  <Link href={`/albums/${album.id}`} className="block cursor-pointer">
                    <div className="p-0 bg-surface-container flex items-center justify-center aspect-[4/3] overflow-hidden">
                      {album.preview_url ? (
                        <img
                          src={album.preview_url}
                          alt={album.title}
                          className="w-full h-full object-cover"
                          loading="lazy"
                        />
                      ) : (
                        <span className="material-symbols-outlined text-5xl text-secondary opacity-20">photo_library</span>
                      )}
                    </div>
                    <div className="p-5">
                      <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1.5 truncate">{album.title}</h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{album.description}</p>
                    </div>
                  </Link>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* BottomNavBar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-50 w-full px-4 pb-6 bg-white/95 backdrop-blur-lg shadow-none border-t border-outline-variant/30">
        <div className="flex justify-around items-center max-w-md mx-auto h-16">
          <Link href="/">
            <button className="text-zinc-400 hover:bg-zinc-100 rounded-full p-3 active:scale-75 transition-all duration-300 ease-out flex flex-col items-center justify-center cursor-pointer">
              <span className="material-symbols-outlined text-[28px]">home</span>
              <span className="text-[10px]">Inicio</span>
            </button>
          </Link>
          <Link href="/albums/new">
            <button className="text-zinc-400 hover:bg-zinc-100 rounded-full p-3 active:scale-75 transition-all duration-300 ease-out flex flex-col items-center justify-center cursor-pointer">
              <span className="material-symbols-outlined text-[28px]">add</span>
              <span className="text-[10px]">Nuevo</span>
            </button>
          </Link>
          <button className="text-zinc-900 scale-110 hover:bg-zinc-100 rounded-full p-3 active:scale-75 transition-all duration-300 ease-out flex flex-col items-center justify-center">
            <span className="material-symbols-outlined text-[28px]" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
            <span className="text-[10px]">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
