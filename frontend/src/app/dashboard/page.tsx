'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { albumService } from '@/services/album.service';
import { apiFetch } from '@/services/api';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

// ── Types ──────────────────────────────────────────────────────────────────────

interface Album {
  id: string;
  title: string;
  description: string;
  status: string;
  created_at: string;
  privacy?: string;
  preview_url?: string | null;
}

// ── Component ──────────────────────────────────────────────────────────────────

export default function Dashboard() {
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);
  const [userName, setUserName] = useState<string>('Usuario');
  const [albums, setAlbums] = useState<Album[]>([]);
  const [albumsLoading, setAlbumsLoading] = useState(true);
  const [updatingPrivacyId, setUpdatingPrivacyId] = useState<string | null>(null);
  const [albumToDelete, setAlbumToDelete] = useState<string | null>(null);

  // ── Init ────────────────────────────────────────────────────────────────────

  useEffect(() => {
    async function loadUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push('/login');
        return;
      }

      const roleRes = await apiFetch(`/api/auth/role/${user.id}`);
      if (roleRes?.role === 'supervisor') {
        router.replace('/supervisor');
        return;
      }

      setUserId(user.id);
      setUserName(
        user.user_metadata?.username || user.email?.split('@')[0] || 'Usuario',
      );
    }
    loadUser();
  }, [router]);

  // ── Load albums ─────────────────────────────────────────────────────────────

  useEffect(() => {
    if (!userId) return;

    async function loadAlbums() {
      try {
        const albumsData = await albumService.getMyAlbums(userId!);
        const rawAlbums: Album[] = albumsData || [];

        const { data: sessionData } = await supabase.auth.getSession();
        const token = sessionData.session?.access_token;

        const enriched = await Promise.all(
          rawAlbums.map(async (album) => {
            try {
              const json = await apiFetch(
                `/api/public/albums/${album.id}/my-files?user_id=${userId}`
              );
              const cleanImages = (json.files || []).filter(
                (f: any) => f.type === 'image' && f.status === 'clean'
              );
              return { ...album, preview_url: cleanImages[0]?.url ?? null };
            } catch {
              return { ...album, preview_url: null };
            }
          }),
        );

        setAlbums(enriched);
      } catch (err) {
        console.error('Error al cargar álbumes', err);
      } finally {
        setAlbumsLoading(false);
      }
    }

    loadAlbums();
  }, [userId]);

  // ── Handlers ───────────────────────────────────────────────────────────────

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const handlePrivacyChange = async (
    albumId: string,
    privacy: 'public' | 'private',
  ) => {
    if (updatingPrivacyId) return;
    try {
      setUpdatingPrivacyId(albumId);
      await albumService.updateAlbumPrivacy(albumId, privacy);
      setAlbums((prev) =>
        prev.map((a) => (a.id === albumId ? { ...a, privacy } : a)),
      );
    } catch (err) {
      console.error('Error al actualizar privacidad', err);
    } finally {
      setUpdatingPrivacyId(null);
    }
  };

  const handleDeleteAlbum = async (albumId: string) => {
    try {
      await albumService.deleteAlbum(albumId);
      setAlbums((prev) => prev.filter((a) => a.id !== albumId));
    } catch (err) {
      console.error('Error al eliminar álbum', err);
      alert('No se pudo eliminar el álbum.');
    }
  };

  // ── Derived stats ──────────────────────────────────────────────────────────

  const stats = {
    total: albums.length,
    approved: albums.filter((a) => a.status === 'approved').length,
    pending: albums.filter((a) => a.status === 'pending').length,
  };

  // ── Render ─────────────────────────────────────────────────────────────────

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
          <h1 className="text-[#E60023] font-bold text-2xl tracking-tighter antialiased">
            SecureFrame
          </h1>
          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-full px-4 py-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">
                person
              </span>
              <span className="font-label-md text-label-md text-secondary truncate max-w-[180px]">
                {userName}
              </span>
            </div>
            <button
              onClick={handleLogout}
              className="h-10 w-10 rounded-full bg-surface-variant overflow-hidden flex items-center justify-center hover:bg-red-50 text-on-surface hover:text-red-500 transition-colors duration-200 cursor-pointer"
              title="Cerrar sesión"
            >
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
              <span
                className="material-symbols-outlined"
                style={{ fontVariationSettings: "'FILL' 1" }}
              >
                person
              </span>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-container-margin py-lg mt-8">
        {/* Welcome Section */}
        <section className="mb-xl text-center md:text-left">
          <h2 className="font-display-lg text-display-lg text-on-surface mb-2">
            Bienvenido de vuelta, {userName}
          </h2>
          <p className="font-body-lg text-body-lg text-on-surface-variant">
            Aquí tienes un resumen de tu portafolio creativo.
          </p>
        </section>

        {/* Stats Bento Grid */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-grid-gutter mb-xl">
          <div className="bg-surface-container-lowest rounded-lg p-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center md:items-start">
            <span
              className="material-symbols-outlined text-primary-container mb-md text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              photo_library
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              {stats.total}
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Total de Álbumes
            </p>
          </div>
          <div className="bg-surface-container-lowest rounded-lg p-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center md:items-start">
            <span
              className="material-symbols-outlined text-tertiary-container mb-md text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              check_circle
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              {stats.approved}
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Aprobados
            </p>
          </div>
          <div className="bg-surface-container-lowest rounded-lg p-lg shadow-[0_8px_30px_rgb(0,0,0,0.04)] flex flex-col items-center md:items-start">
            <span
              className="material-symbols-outlined text-secondary mb-md text-3xl"
              style={{ fontVariationSettings: "'FILL' 1" }}
            >
              pending
            </span>
            <h3 className="font-headline-md text-headline-md text-on-surface">
              {stats.pending}
            </h3>
            <p className="font-body-md text-body-md text-on-surface-variant mt-1">
              Pendientes
            </p>
          </div>
        </section>

        {/* Albums Section */}
        <section>
          <div className="flex justify-between items-end mb-6">
            <h2 className="font-headline-sm text-headline-sm text-on-surface">
              Álbumes Recientes
            </h2>
            <Link
              href="/albums/new"
              className="font-label-md text-label-md text-primary-container hover:underline cursor-pointer"
            >
              Crear Nuevo
            </Link>
          </div>

          {albumsLoading ? (
            <div className="flex justify-center p-20">
              <span className="material-symbols-outlined animate-spin">
                refresh
              </span>
            </div>
          ) : albums.length === 0 ? (
            <div className="text-center py-20 text-on-surface-variant border border-dashed border-outline-variant rounded-xl">
              <span className="material-symbols-outlined text-4xl mb-2 opacity-50">
                folder_open
              </span>
              <p>Aún no tienes ningún álbum.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
              {albums.map((album) => (
                <div
                  key={album.id}
                  className="bg-surface-container-lowest rounded-2xl overflow-hidden shadow-[0_4px_20px_-5px_rgba(0,0,0,0.07)] group relative border border-transparent hover:border-primary-container/20 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_8px_30px_-8px_rgba(0,0,0,0.1)]"
                >
                  {/* Status badge and Delete button — top-right */}
                  <div className="absolute top-3 right-3 z-20 flex gap-2">
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setAlbumToDelete(album.id);
                      }}
                      className="bg-white/90 hover:bg-red-50 hover:text-red-600 text-zinc-500 backdrop-blur-sm w-7 h-7 sm:w-8 sm:h-8 rounded-full shadow-sm transition-colors cursor-pointer flex items-center justify-center"
                      title="Eliminar álbum"
                    >
                      <span className="material-symbols-outlined text-[16px] sm:text-[18px]">delete</span>
                    </button>
                    <div className="bg-white/90 backdrop-blur-sm px-2 py-0.5 sm:px-3 sm:py-1 rounded-full flex items-center gap-1 shadow-sm h-fit">
                      <span
                        className={`w-1.5 h-1.5 sm:w-2 sm:h-2 rounded-full ${
                          album.status === 'approved'
                            ? 'bg-green-500'
                            : album.status === 'pending'
                              ? 'bg-yellow-500'
                              : 'bg-red-500'
                        }`}
                      />
                      <span className="font-label-sm text-label-sm text-zinc-800 text-[10px] sm:text-xs leading-none mt-0.5">
                        {album.status === 'approved'
                          ? 'Aprobado'
                          : album.status === 'pending'
                            ? 'Pendiente'
                            : 'Rechazado'}
                      </span>
                    </div>
                  </div>

                  {/* Image preview */}
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
                        <span className="material-symbols-outlined text-5xl text-secondary opacity-20">
                          photo_library
                        </span>
                      )}
                    </div>
                  </Link>

                  {/* Card body */}
                  <div className="p-4 sm:p-5">
                    {/* Privacy toggle — now inside the card body, never overlaps status */}
                    <div className="flex items-center gap-1 mb-3">
                      <div className="bg-zinc-100 p-0.5 rounded-full flex items-center gap-0.5">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (album.privacy !== 'public')
                              handlePrivacyChange(album.id, 'public');
                          }}
                          className={`px-2 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            album.privacy === 'public'
                              ? 'bg-[#E60023] text-white'
                              : 'text-zinc-700 hover:bg-white'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">public</span>
                          <span className="hidden sm:inline">Público</span>
                        </button>
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            if (album.privacy !== 'private')
                              handlePrivacyChange(album.id, 'private');
                          }}
                          className={`px-2 sm:px-3 py-1 rounded-full text-[11px] sm:text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer ${
                            album.privacy === 'private'
                              ? 'bg-[#E60023] text-white'
                              : 'text-zinc-700 hover:bg-white'
                          }`}
                        >
                          <span className="material-symbols-outlined text-[13px]">lock</span>
                          <span className="hidden sm:inline">Privado</span>
                        </button>
                      </div>
                      {/* Show active label on mobile since text is hidden in buttons */}
                      <span className="sm:hidden text-[11px] font-medium text-zinc-600">
                        {album.privacy === 'public' ? 'Público' : 'Privado'}
                      </span>
                    </div>

                    <Link href={`/albums/${album.id}`} className="block cursor-pointer">
                      <h3 className="font-headline-sm text-headline-sm text-on-surface mb-1.5 truncate">
                        {album.title}
                      </h3>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">
                        {album.description}
                      </p>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* ──── DELETE MODAL ──── */}
      {albumToDelete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-zinc-900/60 backdrop-blur-sm" onClick={() => setAlbumToDelete(null)} />
          <div className="bg-white rounded-[32px] p-8 w-full max-w-[400px] shadow-2xl relative animate-in fade-in zoom-in duration-300">
            <div className="flex flex-col items-center text-center">
              <div className="w-16 h-16 rounded-full bg-red-50 text-[#E60023] flex items-center justify-center mb-6">
                <span className="material-symbols-outlined text-[32px]">delete_forever</span>
              </div>
              <h3 className="text-2xl font-bold text-zinc-900 mb-2">
                ¿Eliminar álbum?
              </h3>
              <p className="text-zinc-500 leading-relaxed mb-8">
                Esta acción eliminará el álbum y todos los archivos permanentemente. No se puede deshacer.
              </p>
              <div className="flex flex-col sm:flex-row w-full gap-3">
                <button
                  onClick={() => setAlbumToDelete(null)}
                  className="flex-1 px-6 py-3.5 rounded-full font-bold text-zinc-700 bg-zinc-100 hover:bg-zinc-200 transition-all duration-200 cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => {
                    if(albumToDelete) handleDeleteAlbum(albumToDelete);
                    setAlbumToDelete(null);
                  }}
                  className="flex-1 px-6 py-3.5 rounded-full font-bold text-white bg-[#E60023] hover:bg-red-700 shadow-lg shadow-red-200 transition-all duration-200 active:scale-[0.98] cursor-pointer"
                >
                  Eliminar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
