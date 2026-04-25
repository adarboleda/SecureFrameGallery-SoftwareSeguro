"use client";

import Link from "next/link";
import { useEffect, useState, use, useRef } from "react";
import { albumService } from "@/services/album.service";
import { fileService } from "@/services/file.service";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface FileData {
  id: string;
  url: string;
  type: string;
  status: string;
}

export default function AlbumWorkspace({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const albumId = resolvedParams.id;
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const [uploadMessage, setUploadMessage] = useState<{text: string; ok: boolean} | null>(null);

  const loadFiles = async (uid: string) => {
    try {
      const data = await fetch(`http://localhost:8000/api/public/albums/${albumId}/my-files?user_id=${uid}`);
      const json = await data.json();
      setFiles(json.files || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { router.push("/login"); return; }
      setUserId(user.id);
      loadFiles(user.id);
    }
    loadUser();
  }, [router, albumId]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    setUploading(true);
    setUploadMessage(null);
    try {
      const result = await fileService.uploadSecureFile(file, userId, albumId);
      const msg = result?.status === "quarantined"
        ? "Archivo subido. Está en cuarentena por análisis de seguridad."
        : "¡Archivo subido exitosamente! Está limpio y visible."
      setUploadMessage({ text: msg, ok: result?.status !== "quarantined" });
      await loadFiles(userId);
    } catch (err: any) {
      setUploadMessage({ text: "Error al subir: " + (err.message || "Error desconocido"), ok: false });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
      setTimeout(() => setUploadMessage(null), 5000);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="bg-background text-on-background min-h-screen pb-24 md:pb-0 pt-20 antialiased selection:bg-primary selection:text-white">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border-none">
        <div className="flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto">
          <Link href="/dashboard">
            <button className="text-zinc-900 hover:bg-zinc-100 transition-colors duration-200 active:scale-95 transition-transform rounded-full p-2 flex items-center justify-center cursor-pointer">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          </Link>
          <h1 className="text-[#E60023] font-bold text-2xl tracking-tighter font-display-lg">SecureFrame</h1>
          <button onClick={handleLogout} className="hover:bg-red-50 text-on-surface hover:text-red-500 transition-colors duration-200 active:scale-95 transition-transform rounded-full w-10 h-10 overflow-hidden flex items-center justify-center bg-tonal cursor-pointer" title="Cerrar sesión">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 mx-auto max-w-7xl pt-4">
        {/* Album Header & Actions */}
        <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-display-lg text-display-lg text-on-background mb-2">Espacio de Trabajo del Álbum</h2>
            <p className="font-body-lg text-body-lg text-secondary">Una colección de tus archivos multimedia subidos.</p>
            <div className="flex gap-2 mt-4">
              <span className="bg-secondary-fixed text-on-surface px-4 py-1 rounded-full font-label-sm text-label-sm">{files.length} elementos</span>
            </div>
          </div>
          {/* Upload Button */}
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            className="hidden" 
            accept="image/jpeg,image/png,application/pdf"
          />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !userId}
            className="bg-primary-container text-white px-8 py-4 rounded-full font-headline-sm text-headline-sm flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(230,0,35,0.2)] hover:shadow-[0_6px_16px_rgba(230,0,35,0.3)] transition-all duration-200 hover:-translate-y-1 w-full md:w-auto cursor-pointer disabled:opacity-50 disabled:hover:-translate-y-0"
          >
            {uploading ? <span className="material-symbols-outlined animate-spin">refresh</span> : <span className="material-symbols-outlined">upload</span>}
            {uploading ? "Subiendo..." : "Subir Archivo"}
          </button>
        </section>

        {/* Masonry Grid */}
        <section>
          {/* Upload feedback toast */}
          {uploadMessage && (
            <div className={`mb-6 flex items-center gap-3 px-5 py-4 rounded-2xl font-body-md text-body-md ${
              uploadMessage.ok ? "bg-green-50 text-green-800 border border-green-200" : "bg-amber-50 text-amber-800 border border-amber-200"
            }`}>
              <span className="material-symbols-outlined text-[20px]">{uploadMessage.ok ? "check_circle" : "warning"}</span>
              {uploadMessage.text}
            </div>
          )}
          {loading ? (
            <div className="py-20 flex flex-col items-center gap-4 text-secondary">
              <span className="material-symbols-outlined animate-spin text-4xl">refresh</span>
              <p className="font-body-md">Cargando archivos...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="py-24 flex flex-col items-center gap-4 border-2 border-dashed border-outline-variant rounded-3xl text-on-surface-variant">
              <span className="material-symbols-outlined text-6xl opacity-30">cloud_upload</span>
              <p className="font-headline-sm text-headline-sm">Aún no hay archivos subidos</p>
              <p className="font-body-md text-body-md opacity-70 text-center max-w-xs">Haz clic en "Subir Archivo" para agregar imágenes o PDFs a este álbum.</p>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !userId}
                className="mt-2 bg-primary-container text-white px-6 py-3 rounded-full font-label-md text-label-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <span className="material-symbols-outlined text-[18px]">upload</span>
                Subir primer archivo
              </button>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 xl:columns-4 gap-5 space-y-5 mt-6">
              {files.map((file) => (
                <div key={file.id} className="break-inside-avoid group cursor-pointer relative">
                  <div className="rounded-2xl overflow-hidden relative shadow-[0_4px_12px_rgba(0,0,0,0.06)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.1)] transition-all duration-300 bg-surface-container">
                    {file.type === "pdf" ? (
                      <div className="w-full h-48 flex items-center justify-center bg-surface-container">
                        <span className="material-symbols-outlined text-6xl text-secondary opacity-40">picture_as_pdf</span>
                      </div>
                    ) : (
                      <img src={file.url} alt="Album media" className="w-full h-auto object-cover" />
                    )}
                    <div className="absolute inset-0 bg-black/20 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center pointer-events-none">
                      <button className="bg-white/90 backdrop-blur-sm text-on-surface px-4 py-2 rounded-full font-label-md text-label-md shadow-sm pointer-events-auto cursor-pointer">Ver</button>
                    </div>
                  </div>
                  <div className="mt-2 px-1 flex items-center gap-2">
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      file.status === 'clean' ? 'bg-green-500' : 
                      file.status === 'quarantined' ? 'bg-red-500' : 'bg-yellow-500'
                    }`}></span>
                    <p className="font-label-sm text-label-sm text-on-surface-variant">
                      {file.status === 'clean' ? 'Limpio' : file.status === 'quarantined' ? 'En cuarentena' : 'Procesando'}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </main>

      {/* BottomNavBar */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 w-full px-4 pb-6 bg-white/95 backdrop-blur-lg shadow-none border-none md:hidden">
        <div className="flex justify-around items-center max-w-md mx-auto h-16">
          <Link href="/dashboard">
            <button className="text-zinc-400 hover:bg-zinc-100 rounded-full p-3 flex flex-col items-center justify-center active:scale-75 transition-all duration-300 ease-out cursor-pointer">
              <span className="material-symbols-outlined">home</span>
              <span className="text-[10px]">Inicio</span>
            </button>
          </Link>
          <Link href="/albums/new">
            <button className="text-zinc-400 hover:bg-zinc-100 rounded-full p-3 flex flex-col items-center justify-center active:scale-75 transition-all duration-300 ease-out cursor-pointer">
              <span className="material-symbols-outlined">add</span>
              <span className="text-[10px]">Nuevo</span>
            </button>
          </Link>
          <button className="text-zinc-900 scale-110 hover:bg-zinc-100 rounded-full p-3 flex flex-col items-center justify-center active:scale-75 transition-all duration-300 ease-out">
            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>person</span>
            <span className="text-[10px]">Perfil</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
