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
}

interface FileData {
  id: string;
  url: string;
  type: string;
}

export default function PublicGallery() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [files, setFiles] = useState<FileData[]>([]);
  const [user, setUser] = useState<any>(null);
  const router = useRouter();

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data.user);
    });
    fetchAlbums();
  }, []);

  useEffect(() => {
    if (selectedAlbum) {
      fetchFiles(selectedAlbum);
    }
  }, [selectedAlbum]);

  async function fetchAlbums() {
    try {
      const data = await albumService.getPublicAlbums();
      setAlbums(data.albums || []);
      if (data.albums && data.albums.length > 0) {
        setSelectedAlbum(data.albums[0].id);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function fetchFiles(albumId: string) {
    try {
      const data = await fileService.getPublicFiles(albumId);
      setFiles(data.files || []);
    } catch (err) {
      console.error(err);
    }
  }

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    router.refresh();
  };

  return (
    <div className="bg-background text-on-background font-body-md antialiased pt-24 pb-32 min-h-screen">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] flex items-center justify-between px-6 py-4 transition-transform duration-200">
        <div className="flex items-center gap-4 w-full">
          <button className="flex items-center justify-center w-10 h-10 hover:bg-zinc-100 transition-colors duration-200 rounded-full shrink-0">
            <span className="material-symbols-outlined text-[#E60023]">potted_plant</span>
          </button>
          
          <div className="flex-1 max-w-2xl mx-auto hidden md:flex items-center bg-[#F0F0F0] rounded-full h-12 px-4 shadow-sm hover:shadow-md transition-shadow">
            <span className="material-symbols-outlined text-secondary mr-2">search</span>
            <input className="bg-transparent border-none outline-none focus:ring-0 w-full text-on-surface font-body-md placeholder:text-secondary px-0" placeholder="Buscar álbumes" type="text"/>
          </div>
          
          <div className="flex-1 md:hidden flex justify-end">
            <button className="flex items-center justify-center w-10 h-10 hover:bg-zinc-100 transition-colors duration-200 rounded-full shrink-0">
              <span className="material-symbols-outlined text-zinc-900">search</span>
            </button>
          </div>
          
          {user ? (
            <div className="flex items-center gap-2">
              <Link href="/dashboard">
                <button className="bg-[#412b29] text-white px-5 py-2.5 rounded-full font-label-md text-label-md hover:bg-zinc-800 transition-colors duration-200 shadow-sm cursor-pointer">
                  Dashboard
                </button>
              </Link>
              <button onClick={handleLogout} className="flex items-center justify-center w-10 h-10 hover:bg-red-50 text-red-500 transition-colors duration-200 rounded-full shrink-0 cursor-pointer" title="Cerrar sesión">
                <span className="material-symbols-outlined">logout</span>
              </button>
            </div>
          ) : (
            <Link href="/login">
              <button className="bg-[#412b29] text-white px-5 py-2.5 rounded-full font-label-md text-label-md hover:bg-zinc-800 transition-colors duration-200 shadow-sm cursor-pointer">
                Iniciar Sesión
              </button>
            </Link>
          )}
        </div>
      </header>

      {/* Main Content Canvas */}
      <main className="px-container-margin mx-auto w-full max-w-[1600px]">
        
        {/* Album Filters */}
        <div className="flex items-center gap-sm mb-lg overflow-x-auto pb-2">
          {albums.length === 0 && !loading && (
             <span className="text-secondary font-label-md">No se encontraron álbumes públicos.</span>
          )}
          {albums.map((album) => (
            <button 
              key={album.id}
              onClick={() => setSelectedAlbum(album.id)}
              className={`px-4 py-2 rounded-full font-label-md whitespace-nowrap shrink-0 transition-colors cursor-pointer ${selectedAlbum === album.id ? "bg-[#111111] text-white" : "bg-secondary-fixed text-on-surface hover:bg-secondary-fixed-dim"}`}
            >
              {album.title}
            </button>
          ))}
        </div>

        {loading ? (
          <div className="col-span-full py-20 flex justify-center">
            <span className="material-symbols-outlined animate-spin text-primary">refresh</span>
          </div>
        ) : files.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-outline-variant rounded-[32px] text-secondary">
             <span className="material-symbols-outlined text-4xl mb-2">image</span>
             <p>Aún no hay archivos públicos.</p>
           </div>
        ) : (
          <div className="masonry-grid">
            {files.map((file) => (
              <article key={file.id} className="masonry-item relative group cursor-pointer">
                <div className="rounded-lg overflow-hidden bg-surface-container-lowest shadow-[0_4px_20px_-5px_rgba(0,0,0,0.04)] relative">
                  
                  {file.type === "pdf" ? (
                    <iframe src={`${file.url}#view=FitH&toolbar=0&navpanes=0`} className="w-full h-96 border-0" title="PDF Preview"></iframe>
                  ) : (
                    <img 
                      src={file.url} 
                      alt="Gallery file" 
                      className="w-full h-auto object-cover group-hover:scale-105 transition-transform duration-500" 
                    />
                  )}

                  <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center backdrop-blur-sm pointer-events-none">
                    <button className="bg-white/95 text-on-surface px-6 py-3 rounded-full font-label-md text-label-md shadow-lg transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 pointer-events-auto cursor-pointer">
                      Ver Detalles
                    </button>
                  </div>
                </div>
                <div className="mt-3 px-2 flex justify-between items-center">
                  <p className="font-label-md text-label-md text-on-surface">Colección Segura</p>
                  <button className="w-8 h-8 rounded-full bg-surface-container-low flex items-center justify-center hover:bg-surface-variant transition-colors cursor-pointer text-secondary">
                    <span className="material-symbols-outlined text-[18px]">more_horiz</span>
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
