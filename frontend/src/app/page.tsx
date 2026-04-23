"use client";

import { useEffect, useState } from "react";
import { ShieldCheck, Image as ImageIcon, Loader2 } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { albumService } from "@/services/album.service";
import { imageService } from "@/services/image.service";

interface Album {
  id: string;
  title: string;
  description: string;
  created_at: string;
}

interface Image {
  id: string;
  url: string;
}

export default function PublicGallery() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAlbum, setSelectedAlbum] = useState<string | null>(null);
  const [images, setImages] = useState<Image[]>([]);

  useEffect(() => {
    fetchAlbums();
  }, []);

  useEffect(() => {
    if (selectedAlbum) {
      fetchImages(selectedAlbum);
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

  async function fetchImages(albumId: string) {
    try {
      const data = await imageService.getPublicImages(albumId);
      setImages(data.images || []);
    } catch (err) {
      console.error(err);
    }
  }

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white">
      {/* Navbar */}
      <nav className="border-b border-white/10 bg-black/50 backdrop-blur-md sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ShieldCheck className="w-6 h-6 text-blue-500" />
            <span className="font-bold text-lg tracking-tight">SecureFrame</span>
          </div>
          <div className="flex gap-4">
            <Link href="/login">
              <Button variant="outline" className="border-white/10 bg-white/5 hover:bg-white/10 text-gray-300">
                Iniciar Sesión
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto px-4 py-8">
        <div className="mb-12 text-center space-y-4">
          <h1 className="text-4xl md:text-6xl font-extrabold bg-gradient-to-r from-blue-400 to-purple-500 text-transparent bg-clip-text">
            Galería Pública Segura
          </h1>
          <p className="text-gray-400 max-w-2xl mx-auto">
            Explora las imágenes compartidas por la comunidad. Todo el contenido ha sido rigurosamente escaneado contra amenazas LSB y esteganográficas.
          </p>
        </div>

        {loading ? (
          <div className="flex justify-center py-20">
            <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
          </div>
        ) : (
          <div className="flex flex-col md:flex-row gap-8">
            {/* Sidebar Albums */}
            <div className="w-full md:w-64 flex-shrink-0 space-y-2">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-4">Álbumes Aprobados</h2>
              {albums.length === 0 && <p className="text-sm text-gray-500">No hay álbumes públicos aún.</p>}
              {albums.map((album) => (
                <button
                  key={album.id}
                  onClick={() => setSelectedAlbum(album.id)}
                  className={`w-full text-left p-4 rounded-xl transition-all ${
                    selectedAlbum === album.id 
                      ? "bg-blue-500/10 border border-blue-500/30 text-white" 
                      : "bg-black/40 border border-white/5 text-gray-400 hover:bg-white/5"
                  }`}
                >
                  <h3 className="font-medium truncate">{album.title}</h3>
                  <p className="text-xs mt-1 truncate">{album.description}</p>
                </button>
              ))}
            </div>

            {/* Image Grid */}
            <div className="flex-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
                {images.length === 0 && selectedAlbum && (
                  <div className="col-span-full py-20 text-center text-gray-500 border border-dashed border-white/10 rounded-2xl">
                    <ImageIcon className="w-12 h-12 mx-auto mb-4 opacity-20" />
                    <p>Este álbum no tiene imágenes limpias aún.</p>
                  </div>
                )}
                {images.map((img) => (
                  <div key={img.id} className="group relative aspect-square rounded-2xl overflow-hidden bg-black/50 border border-white/10">
                    <img 
                      src={img.url} 
                      alt="Secure image" 
                      className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110"
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/0 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex items-end p-4">
                      <span className="text-xs bg-blue-500 text-white px-2 py-1 rounded-md flex items-center gap-1">
                        <ShieldCheck className="w-3 h-3" /> Limpio
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
