'use client';

import Link from 'next/link';
import { useEffect, useState, use, useRef, useCallback } from 'react';
import { fileService } from '@/services/file.service';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

interface FileData {
  id: string;
  url: string;
  type: string;
  status: string;
  name?: string;
}

export default function AlbumWorkspace({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = use(params);
  const albumId = resolvedParams.id;
  const [files, setFiles] = useState<FileData[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<{
    text: string;
    ok: boolean;
  } | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [imageErrors, setImageErrors] = useState<Record<string, boolean>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const loadFiles = useCallback(async (uid: string, aid: string) => {
    try {
      const { data } = await supabase.auth.getSession();
      const token = data.session?.access_token;
      const res = await fetch(
        `http://localhost:8000/api/public/albums/${aid}/my-files?user_id=${uid}`,
        {
          headers: token ? { Authorization: `Bearer ${token}` } : undefined,
        },
      );
      if (!res.ok) throw new Error(`Error ${res.status}`);
      const json = await res.json();
      setFiles(json.files || []);
    } catch (err) {
      console.error('Error cargando archivos:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    async function init() {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        router.push('/login');
        return;
      }
      setUserId(user.id);
      await loadFiles(user.id, albumId);
    }
    init();
  }, [albumId, router, loadFiles]);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !userId) return;

    const allowedTypes = ["image/jpeg", "image/png", "application/pdf"];
    const allowedExts = [".jpg", ".jpeg", ".png", ".pdf"];
    const fileName = file.name.toLowerCase();
    const hasAllowedExt = allowedExts.some((ext) => fileName.endsWith(ext));
    if (!allowedTypes.includes(file.type) && !hasAllowedExt) {
      setUploadMessage({
        text: "❌ Formato no permitido. Solo se aceptan JPEG, PNG o PDF.",
        ok: false,
      });
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setUploading(true);
    setUploadMessage(null);
    try {
      const result = await fileService.uploadSecureFile(file, userId, albumId);
      const isQuarantine = result?.status === 'quarantined';
      setUploadMessage({
        text: isQuarantine
          ? '⚠️ Archivo detectado como sospechoso y enviado a cuarentena.'
          : '✅ ¡Archivo subido y verificado! Está limpio.',
        ok: !isQuarantine,
      });
      await loadFiles(userId, albumId);
    } catch (err: any) {
      setUploadMessage({
        text: '❌ Error al subir: ' + (err.message || 'Error desconocido'),
        ok: false,
      });
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setTimeout(() => setUploadMessage(null), 6000);
    }
  };

  const handleDeleteFile = async (fileId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // evitar abrir el lightbox
    if (
      !confirm(
        '¿Estás seguro de que quieres eliminar este archivo? Esta acción no se puede deshacer.',
      )
    )
      return;
    setDeletingId(fileId);
    try {
      await fileService.deleteFile(fileId);
      setFiles((prev) => prev.filter((f) => f.id !== fileId));
      setUploadMessage({ text: 'Archivo eliminado correctamente.', ok: true });
      setTimeout(() => setUploadMessage(null), 4000);
    } catch (err: any) {
      setUploadMessage({
        text: '❌ Error al eliminar: ' + (err.message || 'Error desconocido'),
        ok: false,
      });
      setTimeout(() => setUploadMessage(null), 5000);
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  const statusLabel = (s: string) => {
    if (s === 'clean')
      return { label: 'Limpio', color: 'bg-green-500', text: 'text-green-700' };
    if (s === 'quarantined')
      return {
        label: 'En cuarentena',
        color: 'bg-red-500',
        text: 'text-red-700',
      };
    if (s === 'rejected')
      return {
        label: 'Rechazado',
        color: 'bg-red-800',
        text: 'text-red-900',
      };
    return {
      label: 'Procesando',
      color: 'bg-yellow-400',
      text: 'text-yellow-700',
    };
  };

  const [lightbox, setLightbox] = useState<FileData | null>(null);

  return (
    <div className="bg-background text-on-background min-h-screen pb-24 md:pb-0 pt-20 antialiased">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)]">
        <div className="flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto">
          <Link href="/dashboard">
            <button className="text-zinc-900 hover:bg-zinc-100 transition-colors duration-200 rounded-full p-2 flex items-center justify-center cursor-pointer">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          </Link>
          <h1 className="text-[#E60023] font-bold text-2xl tracking-tighter">
            SecureFrame
          </h1>
          <button
            onClick={handleLogout}
            className="hover:bg-red-50 text-zinc-500 hover:text-red-500 transition-colors duration-200 rounded-full w-10 h-10 flex items-center justify-center cursor-pointer"
            title="Cerrar sesión"
          >
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="px-6 mx-auto max-w-7xl pt-6">
        {/* Album Header & Actions */}
        <section className="mb-8 flex flex-col md:flex-row md:items-end justify-between gap-4">
          <div>
            <h2 className="font-bold text-2xl text-on-background mb-1">
              Espacio de Trabajo del Álbum
            </h2>
            <p className="text-secondary text-base">
              Tus archivos multimedia subidos y su estado de análisis.
            </p>
            <div className="flex gap-2 mt-3">
              <span className="bg-secondary-fixed text-on-surface px-4 py-1 rounded-full text-sm font-medium">
                {files.length} {files.length === 1 ? 'elemento' : 'elementos'}
              </span>
            </div>
          </div>
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
            className="bg-[#E60023] text-white px-8 py-4 rounded-full font-semibold flex items-center justify-center gap-2 shadow-[0_4px_12px_rgba(230,0,35,0.3)] hover:shadow-[0_6px_20px_rgba(230,0,35,0.4)] transition-all duration-200 hover:-translate-y-0.5 w-full md:w-auto cursor-pointer disabled:opacity-50 disabled:hover:translate-y-0"
          >
            {uploading ? (
              <span className="material-symbols-outlined animate-spin text-[20px]">
                refresh
              </span>
            ) : (
              <span className="material-symbols-outlined text-[20px]">
                upload
              </span>
            )}
            {uploading ? 'Subiendo...' : 'Subir Archivo'}
          </button>
        </section>

        {/* Upload feedback toast */}
        {uploadMessage && (
          <div
            className={`mb-6 flex items-start gap-3 px-5 py-4 rounded-2xl text-sm ${
              uploadMessage.ok
                ? 'bg-green-50 text-green-800 border border-green-200'
                : 'bg-amber-50 text-amber-800 border border-amber-200'
            }`}
          >
            {uploadMessage.text}
          </div>
        )}

        {/* Files Grid */}
        <section>
          {loading ? (
            <div className="py-24 flex flex-col items-center gap-4 text-secondary">
              <span className="material-symbols-outlined animate-spin text-5xl text-[#E60023]">
                refresh
              </span>
              <p className="text-base">Cargando archivos...</p>
            </div>
          ) : files.length === 0 ? (
            <div className="py-24 flex flex-col items-center gap-5 border-2 border-dashed border-outline-variant rounded-3xl text-on-surface-variant">
              <span className="material-symbols-outlined text-7xl opacity-20">
                cloud_upload
              </span>
              <div className="text-center">
                <p className="font-bold text-xl mb-2">
                  Aún no hay archivos subidos
                </p>
                <p className="text-sm opacity-70">
                  Sube imágenes (JPG, PNG) o documentos (PDF) a este álbum.
                </p>
              </div>
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploading || !userId}
                className="mt-1 bg-[#E60023] text-white px-6 py-3 rounded-full font-medium flex items-center gap-2 cursor-pointer disabled:opacity-50 hover:shadow-[0_4px_14px_rgba(230,0,35,0.35)] transition-all"
              >
                <span className="material-symbols-outlined text-[18px]">
                  upload
                </span>
                Subir primer archivo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-5">
              {files.map((file) => {
                const st = statusLabel(file.status);
                const isDeleting = deletingId === file.id;
                return (
                  <div
                    key={file.id}
                    className="group cursor-pointer"
                    onClick={() => !isDeleting && setLightbox(file)}
                  >
                    <div className="rounded-2xl overflow-hidden relative shadow-[0_4px_14px_rgba(0,0,0,0.08)] hover:shadow-[0_8px_28px_rgba(0,0,0,0.12)] transition-all duration-300 bg-surface-container aspect-square">
                      {file.type === 'pdf' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-2 bg-red-50">
                          <span
                            className="material-symbols-outlined text-5xl text-[#E60023]"
                            style={{ fontVariationSettings: "'FILL' 1" }}
                          >
                            picture_as_pdf
                          </span>
                          <span className="text-xs text-red-700 font-medium">
                            Toca para abrir PDF
                          </span>
                        </div>
                      ) : imageErrors[file.id] ? (
                        <div className="w-full h-full flex flex-col items-center justify-center gap-1 bg-surface-container-high text-secondary">
                          <span className="material-symbols-outlined text-4xl">broken_image</span>
                          <span className="text-xs font-medium text-center px-2">No disponible</span>
                        </div>
                      ) : (
                        <img
                          src={file.url}
                          alt="Archivo subido"
                          className="w-full h-full object-cover"
                          loading="lazy"
                          onError={() => setImageErrors(prev => ({ ...prev, [file.id]: true }))}
                        />
                      )}
                      {/* Overlay on hover: view + delete */}
                      <div className="absolute inset-0 bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-200 flex items-center justify-center gap-3 pointer-events-none group-hover:pointer-events-auto">
                        <span className="bg-white/90 backdrop-blur-sm text-on-surface px-4 py-2 rounded-full text-sm font-medium shadow-sm">
                          {file.type === 'pdf' ? 'Abrir PDF' : 'Ver imagen'}
                        </span>
                        <button
                          onClick={(e) => handleDeleteFile(file.id, e)}
                          disabled={isDeleting}
                          className="w-9 h-9 rounded-full bg-red-500 hover:bg-red-600 text-white flex items-center justify-center shadow-md transition-colors cursor-pointer disabled:opacity-60"
                          title="Eliminar archivo"
                        >
                          {isDeleting ? (
                            <span className="material-symbols-outlined text-[16px] animate-spin">
                              refresh
                            </span>
                          ) : (
                            <span className="material-symbols-outlined text-[16px]">
                              delete
                            </span>
                          )}
                        </button>
                      </div>
                    </div>
                    <div className="mt-2 px-1 flex flex-col gap-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`w-2 h-2 rounded-full shrink-0 ${st.color}`}
                        ></span>
                        <p className={`text-xs font-medium ${st.text}`}>
                          {st.label}
                        </p>
                      </div>
                      <p className="text-xs text-secondary truncate" title={file.name || ''}>
                        {file.name || 'Archivo sin nombre'}
                      </p>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      </main>

      {/* Mobile BottomNav */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 w-full px-4 pb-5 md:hidden">
        <div className="flex justify-around items-center max-w-md mx-auto h-16 bg-white/95 backdrop-blur-lg rounded-full shadow-[0_8px_30px_-10px_rgba(0,0,0,0.12)] border border-zinc-100">
          <Link href="/dashboard">
            <button className="text-zinc-400 hover:bg-zinc-100 rounded-full p-3 flex flex-col items-center cursor-pointer">
              <span className="material-symbols-outlined text-[22px]">
                home
              </span>
              <span className="text-[10px]">Inicio</span>
            </button>
          </Link>
          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading || !userId}
            className="bg-[#E60023] text-white rounded-full p-3.5 flex items-center justify-center shadow-[0_4px_14px_rgba(230,0,35,0.35)] cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">
              upload
            </span>
          </button>
          <button
            onClick={handleLogout}
            className="text-zinc-400 hover:bg-zinc-100 rounded-full p-3 flex flex-col items-center cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">
              logout
            </span>
            <span className="text-[10px]">Salir</span>
          </button>
        </div>
      </nav>

      {/* Lightbox */}
      {lightbox && (
        <div
          className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-sm flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-4 right-4 w-11 h-11 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center text-white hover:bg-white/30 transition-colors cursor-pointer z-10"
            onClick={() => setLightbox(null)}
          >
            <span className="material-symbols-outlined">close</span>
          </button>
          <div
            onClick={(e) => e.stopPropagation()}
            className="max-w-5xl w-full max-h-[92vh]"
          >
            {lightbox.type === 'pdf' ? (
              <iframe
                src={`${lightbox.url}#view=FitH&toolbar=1`}
                className="w-full h-[85vh] rounded-2xl border-0 bg-white"
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
