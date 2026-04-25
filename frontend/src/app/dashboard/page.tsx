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
}

export default function Dashboard() {
  const router = useRouter();
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>("Usuario");

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
      setUserName(user.user_metadata?.username || user.email?.split("@")[0] || "Usuario");
    }
    loadUser();
  }, [router]);

  useEffect(() => {
    async function loadAlbums() {
      if (!userId) return;
      try {
        const data = await albumService.getMyAlbums(userId);
        setAlbums(data || []);
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
          <button className="w-10 h-10 rounded-full overflow-hidden hover:bg-zinc-100 transition-colors duration-200 active:scale-95 cursor-pointer">
            <span className="material-symbols-outlined mt-2">person</span>
          </button>
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
          <div className="flex justify-between items-end mb-lg">
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
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-grid-gutter space-y-grid-gutter">
              {albums.map((album) => (
                <Link key={album.id} href={`/albums/${album.id}`}>
                  <div className="break-inside-avoid bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] group cursor-pointer relative border border-transparent hover:border-primary-container/20 transition-colors">
                    <div className="absolute top-4 right-4 z-10 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full flex items-center gap-1 shadow-sm">
                      <span className={`w-2 h-2 rounded-full ${album.status === 'approved' ? 'bg-green-500' : album.status === 'pending' ? 'bg-yellow-500' : 'bg-red-500'}`}></span>
                      <span className="font-label-sm text-label-sm text-zinc-800 capitalize">{album.status === 'approved' ? 'Aprobado' : album.status === 'pending' ? 'Pendiente' : album.status}</span>
                    </div>
                    <div className="p-xl bg-surface-container flex items-center justify-center">
                      <span className="material-symbols-outlined text-6xl text-secondary opacity-20">photo_library</span>
                    </div>
                    <div className="p-md">
                      <h3 className="font-headline-md text-headline-md text-on-surface mb-1 truncate">{album.title}</h3>
                      <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">{album.description}</p>
                    </div>
                  </div>
                </Link>
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
