"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { albumService } from "@/services/album.service";
import { fileService } from "@/services/file.service";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface Album {
  id: string;
  title: string;
  description: string;
  created_at: string;
  preview_url?: string;   // primera imagen del álbum
  owner_name?: string;
}

interface FileData {
  id: string;
  url: string;
  type: string;
}

export default function PublicGallery() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [selectedAlbum, setSelectedAlbum] = useState<Album | null>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [filesLoading, setFilesLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [lightbox, setLightbox] = useState<FileData | null>(null);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user));
    fetchAlbums();
  }, []);

  async function fetchAlbums() {
    try {
      const data = await albumService.getPublicAlbums();
      const rawAlbums: Album[] = data.albums || [];

      // Enrich each album with its first clean image for preview
      const enriched = await Promise.all(
        rawAlbums.map(async (alb) => {
          try {
            const res = await fileService.getPublicFiles(alb.id);
            const imgs = (res.files || []).filter((f: FileData) => f.type === "image");
            return { ...alb, preview_url: imgs[0]?.url || null };
          } catch {
            return alb;
          }
        })
      );
      setAlbums(enriched);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function openAlbum(album: Album) {
    setSelectedAlbum(album);
    setFiles([]);
    setFilesLoading(true);
    try {
      const data = await fileService.getPublicFiles(album.id);
      setFiles(data.files || []);
    } catch (err) {
      console.error(err);
    } finally {
      setFilesLoading(false);
    }
  }

  function closeAlbum() {
    setSelectedAlbum(null);
    setFiles([]);
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  const filtered = albums.filter(
    (a) =>
      a.title.toLowerCase().includes(search.toLowerCase()) ||
      a.description?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="bg-background text-on-background font-body-md antialiased min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl shadow-[0_2px_20px_-5px_rgba(0,0,0,0.07)]">
        <div className="flex items-center gap-4 px-6 py-3.5 max-w-7xl mx-auto">
          {/* Logo */}
          <span className="text-[#E60023] font-bold text-xl tracking-tighter shrink-0">SecureFrame</span>

          {/* Search */}
          <div className="flex-1 max-w-xl mx-auto flex items-center bg-zinc-100 rounded-full h-11 px-4 gap-2">
            <span className="material-symbols-outlined text-secondary text-[20px]">search</span>
            <input
              className="bg-transparent border-none outline-none w-full text-sm text-on-surface placeholder:text-secondary"
              placeholder="Buscar álbumes..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            {search && (
              <button onClick={() => setSearch("")} className="text-secondary hover:text-on-surface cursor-pointer">
                <span className="material-symbols-outlined text-[18px]">close</span>
              </button>
            )}
          </div>

          {/* Auth buttons */}
          {user ? (
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/dashboard">
                <button className="bg-zinc-900 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-700 transition-colors cursor-pointer">
                  Mi Panel
                </button>
              </Link>
              <button
                onClick={handleLogout}
                className="w-10 h-10 rounded-full hover:bg-red-50 text-red-500 flex items-center justify-center transition-colors cursor-pointer"
                title="Cerrar sesión"
              >
                <span className="material-symbols-outlined">logout</span>
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 shrink-0">
              <Link href="/login">
                <button className="bg-zinc-900 text-white px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-700 transition-colors cursor-pointer">
                  Iniciar Sesión
                </button>
              </Link>
              <Link href="/register">
                <button className="border border-zinc-200 text-zinc-800 px-5 py-2 rounded-full text-sm font-medium hover:bg-zinc-50 transition-colors cursor-pointer">
                  Registrarse
                </button>
              </Link>
            </div>
          )}
        </div>
      </header>

      {/* ──────────────────── ALBUM DETAIL VIEW ──────────────────── */}
      {selectedAlbum ? (
        <main className="pt-20 pb-16 px-6 max-w-7xl mx-auto">
          {/* Back + Title */}
          <div className="flex items-center gap-4 mb-8 pt-4">
            <button
              onClick={closeAlbum}
              className="flex items-center gap-2 text-secondary hover:text-on-surface transition-colors cursor-pointer"
            >
              <span className="material-symbols-outlined">arrow_back</span>
              <span className="text-sm font-medium">Volver a álbumes</span>
            </button>
          </div>
          <h1 className="font-bold text-3xl text-on-background mb-1">{selectedAlbum.title}</h1>
          {selectedAlbum.owner_name ? (
            <p className="text-secondary mb-2">Por {selectedAlbum.owner_name}</p>
          ) : null}
          {selectedAlbum.description && (
            <p className="text-secondary mb-8">{selectedAlbum.description}</p>
          )}

          {filesLoading ? (
            <div className="py-24 flex flex-col items-center gap-4 text-secondary">
              <span className="material-symbols-outlined animate-spin text-4xl text-[#E60023]">refresh</span>
              <p>Cargando contenido...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="py-24 flex flex-col items-center gap-4 border-2 border-dashed border-outline-variant rounded-3xl text-secondary">
              <span className="material-symbols-outlined text-6xl opacity-30">image_not_supported</span>
              <p className="text-base">Este álbum aún no tiene archivos públicos.</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {files.map((file) => (
                <div
                  key={file.id}
                  className="group cursor-pointer"
                  onClick={() => setLightbox(file)}
                >
                  <div className="rounded-2xl overflow-hidden aspect-square relative shadow-[0_4px_12px_rgba(0,0,0,0.07)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.13)] transition-all duration-300 bg-surface-container">
                    {file.type === "pdf" ? (
                      <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-red-50">
                        <span className="material-symbols-outlined text-5xl text-[#E60023]" style={{ fontVariationSettings: "'FILL' 1" }}>picture_as_pdf</span>
                        <span className="text-xs text-red-700 font-medium">PDF</span>
                      </div>
                    ) : (
                      <img
                        src={file.url}
                        alt="Contenido del álbum"
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                      />
                    )}
                    <div className="absolute inset-0 bg-black/25 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center">
                      <span className="bg-white/90 backdrop-blur-sm text-on-surface px-4 py-2 rounded-full text-sm font-medium shadow-sm">
                        {file.type === "pdf" ? "Ver PDF" : "Ver imagen"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      ) : (
        /* ──────────────────── ALBUMS GRID ──────────────────── */
        <main className="pt-20 pb-16 px-6 max-w-7xl mx-auto">
          <div className="pt-8 mb-6">
            <h1 className="font-bold text-3xl text-on-background mb-1">Galería Pública</h1>
            <p className="text-secondary">Explora las colecciones de la comunidad SecureFrame.</p>
          </div>

          {loading ? (
            <div className="py-24 flex flex-col items-center gap-4">
              <span className="material-symbols-outlined animate-spin text-4xl text-[#E60023]">refresh</span>
            </div>
          ) : filtered.length === 0 ? (
            <div className="py-24 flex flex-col items-center gap-4 border-2 border-dashed border-outline-variant rounded-3xl text-secondary">
              <span className="material-symbols-outlined text-6xl opacity-30">photo_library</span>
              <p className="text-base">{search ? "No se encontraron álbumes con esa búsqueda." : "Aún no hay álbumes públicos disponibles."}</p>
              {search && (
                <button onClick={() => setSearch("")} className="text-[#E60023] text-sm font-medium cursor-pointer hover:underline">
                  Limpiar búsqueda
                </button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
              {filtered.map((album) => (
                <div
                  key={album.id}
                  className="group cursor-pointer"
                  onClick={() => openAlbum(album)}
                >
                  <div className="rounded-2xl overflow-hidden shadow-[0_4px_16px_rgba(0,0,0,0.07)] hover:shadow-[0_8px_32px_rgba(0,0,0,0.12)] transition-all duration-300 hover:-translate-y-1 bg-surface-container-lowest">
                    {/* Preview image */}
                    <div className="aspect-[4/3] relative bg-surface-container overflow-hidden">
                      {album.preview_url ? (
                        <img
                          src={album.preview_url}
                          alt={album.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-secondary opacity-40">
                          <span className="material-symbols-outlined text-5xl">photo_library</span>
                        </div>
                      )}
                      <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-end justify-center pb-4">
                        <span className="bg-white/90 backdrop-blur-sm text-on-surface px-4 py-2 rounded-full text-sm font-medium shadow-sm">
                          Ver álbum
                        </span>
                      </div>
                    </div>
                    {/* Info */}
                    <div className="p-4">
                      <h2 className="font-bold text-base text-on-surface truncate mb-1">{album.title}</h2>
                      {album.owner_name ? (
                        <p className="font-body-sm text-body-sm text-secondary mt-2">Por {album.owner_name}</p>
                      ) : null}
                      {album.description ? (
                        <p className="text-secondary text-sm line-clamp-2">{album.description}</p>
                      ) : null}
                      <p className="text-xs text-secondary mt-2">
                        {new Date(album.created_at).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      )}

      {/* ──── LIGHTBOX ──── */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer"
            onClick={() => setLightbox(null)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <div onClick={(e) => e.stopPropagation()} className="max-w-4xl w-full max-h-[90vh]">
            {lightbox.type === "pdf" ? (
              <iframe
                src={`${lightbox.url}#view=FitH&toolbar=1`}
                className="w-full h-[80vh] rounded-2xl border-0 bg-white"
                title="Vista PDF"
              />
            ) : (
              <img
                src={lightbox.url}
                alt="Vista ampliada"
                className="max-w-full max-h-[85vh] object-contain rounded-2xl shadow-2xl mx-auto block"
              />
            )}
          </div>
        </div>
      )}
    </div>
  );
}
