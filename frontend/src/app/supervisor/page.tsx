"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fileService } from "@/services/file.service";
import { albumService } from "@/services/album.service";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface QuarantinedFile {
  id: string;
  url?: string;
  file_type?: string;
  type?: string;
  preview_url?: string;
  album_id: string;
  album_title?: string;
  user_id?: string;
  user_email?: string;
  status: string;
}

interface PendingAlbum {
  id: string;
  title: string;
  description: string;
  created_at: string;
  user_id: string;
  user_email?: string;
  user_name?: string;
  status: string;
}

export default function SupervisorDashboard() {
  const [files, setFiles] = useState<QuarantinedFile[]>([]);
  const [pendingAlbums, setPendingAlbums] = useState<PendingAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [supervisorId, setSupervisorId] = useState<string | null>(null);
  const [supervisorEmail, setSupervisorEmail] = useState<string>("");
  const [activeTab, setActiveTab] = useState<"albums" | "quarantine">("albums");
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }

        // Verificar que sea supervisor
        const roleRes = await fetch(`http://localhost:8000/api/auth/role/${user.id}`);
        if (roleRes.ok) {
          const { role } = await roleRes.json();
          if (role !== "supervisor") {
            router.replace("/dashboard");
            return;
          }
        } else {
          router.push("/login");
          return;
        }

        setSupervisorId(user.id);
        setSupervisorEmail(user.email || "Supervisor");

        // Cargar álbumes pendientes y archivos en cuarentena en paralelo
        const [albumsData, filesData] = await Promise.allSettled([
          albumService.getPendingAlbums(user.id),
          fileService.getQuarantinedFiles(user.id),
        ]);

        if (albumsData.status === "fulfilled") {
          const rawAlbums: PendingAlbum[] = albumsData.value?.pending_albums || albumsData.value || [];
          // Enrich with user info from admin endpoint
          const enriched = await Promise.all(rawAlbums.map(async (alb) => {
            try {
              const usersRes = await fetch(`http://localhost:8000/api/admin/users?supervisor_id=${user.id}`);
              if (!usersRes.ok) return alb;
              const { users } = await usersRes.json();
              const match = users.find((u: any) => u.id === alb.user_id);
              return { ...alb, user_email: match?.email || alb.user_id, user_name: match?.username || "" };
            } catch { return alb; }
          }));
          setPendingAlbums(enriched);
        }
        if (filesData.status === "fulfilled") {
          const rawFiles: QuarantinedFile[] = filesData.value?.quarantined_files || filesData.value || [];
          // Enrich with album title and user email
          try {
            const usersRes = await fetch(`http://localhost:8000/api/admin/users?supervisor_id=${user.id}`);
            const { users } = usersRes.ok ? await usersRes.json() : { users: [] };
            // Fetch album info for each file
            const enrichedFiles = await Promise.all(rawFiles.map(async (f) => {
              try {
                const albumRes = await fetch(`http://localhost:8000/api/albums/${f.album_id}?supervisor_id=${user.id}`);
                const albumData = albumRes.ok ? await albumRes.json() : null;
                const albumTitle = albumData?.title || albumData?.album?.title || null;
                const ownerId = albumData?.user_id || albumData?.album?.user_id || null;
                const ownerMatch = users.find((u: any) => u.id === ownerId);
                return {
                  ...f,
                  album_title: albumTitle || f.album_id.substring(0, 12) + "…",
                  user_id: ownerId,
                  user_email: ownerMatch?.email || (ownerId ? ownerId.substring(0, 12) + "…" : "—")
                };
              } catch { return f; }
            }));
            setFiles(enrichedFiles);
          } catch {
            setFiles(rawFiles);
          }
        }
      } catch (err: any) {
        console.error("Error loading supervisor data", err);
        router.push("/login");
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [router]);

  const handleAlbumDecision = async (albumId: string, action: "approve" | "reject") => {
    if (!supervisorId) return;
    setDecidingId(albumId);
    try {
      const reason = window.prompt("Motivo (opcional):") || "";
      await albumService.decideAlbum(albumId, supervisorId, action, reason);
      setPendingAlbums(prev => prev.filter(a => a.id !== albumId));
    } catch (err) {
      console.error(`Error al ${action} álbum`, err);
    } finally {
      setDecidingId(null);
    }
  };

  const handleFileDecision = async (fileId: string, action: "approve" | "reject") => {
    if (!supervisorId) return;
    setDecidingId(fileId);
    try {
      const reason = window.prompt("Motivo (opcional):") || "";
      await fileService.decideFile(fileId, supervisorId, action, reason);
      setFiles(prev => prev.filter(f => f.id !== fileId));
    } catch (err) {
      console.error(`Error al ${action} archivo`, err);
    } finally {
      setDecidingId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md antialiased">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.07)]">
        <div className="flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#E60023]" style={{fontVariationSettings: "'FILL' 1"}}>admin_panel_settings</span>
            <span className="text-[#E60023] font-bold text-xl tracking-tighter">Panel de Supervisor</span>
          </div>
          <div className="hidden md:flex items-center gap-3">
            <Link href="/" className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-zinc-100 transition-colors text-zinc-600 font-label-md text-label-md cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">home</span>
              Galería Pública
            </Link>
            <Link href="/admin/users" className="flex items-center gap-2 px-4 py-2 rounded-full hover:bg-zinc-100 transition-colors text-zinc-600 font-label-md text-label-md cursor-pointer">
              <span className="material-symbols-outlined text-[18px]">manage_accounts</span>
              Usuarios
            </Link>
            <div className="flex items-center gap-2 bg-surface-container-lowest border border-outline-variant rounded-full px-4 py-2">
              <span className="material-symbols-outlined text-secondary text-[18px]">person</span>
              <span className="font-label-md text-label-md text-secondary truncate max-w-[180px]">{supervisorEmail}</span>
            </div>
            <button onClick={handleLogout} className="h-10 w-10 rounded-full bg-surface-variant flex items-center justify-center hover:bg-red-50 text-on-surface hover:text-red-500 transition-colors duration-200 cursor-pointer" title="Cerrar sesión">
              <span className="material-symbols-outlined">logout</span>
            </button>
          </div>
          <button onClick={handleLogout} className="md:hidden h-10 w-10 rounded-full bg-surface-variant flex items-center justify-center hover:bg-red-50 hover:text-red-500 transition-colors cursor-pointer">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      <main className="pt-24 pb-28 px-6 max-w-7xl mx-auto">
        {/* Welcome Banner */}
        <section className="mb-8">
          <h1 className="font-display-lg text-display-lg text-on-background mb-1">Bienvenido, Supervisor</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant">Gestiona los álbumes y revisa los archivos marcados por el sistema.</p>
        </section>

        {/* Stats Row */}
        <section className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-8">
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)] flex flex-col gap-1">
            <span className="material-symbols-outlined text-amber-500 text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>pending_actions</span>
            <p className="font-headline-lg text-headline-lg text-on-surface mt-1">{loading ? "—" : pendingAlbums.length}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Álbumes pendientes</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)] flex flex-col gap-1">
            <span className="material-symbols-outlined text-[#E60023] text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>security</span>
            <p className="font-headline-lg text-headline-lg text-on-surface mt-1">{loading ? "—" : files.length}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Archivos en cuarentena</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)] flex flex-col gap-1 col-span-2 md:col-span-1">
            <span className="material-symbols-outlined text-green-600 text-3xl" style={{fontVariationSettings: "'FILL' 1"}}>verified_user</span>
            <p className="font-headline-lg text-headline-lg text-on-surface mt-1">Activo</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Estado del sistema</p>
          </div>
        </section>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6 bg-secondary-fixed p-1 rounded-full w-fit">
          <button
            onClick={() => setActiveTab("albums")}
            className={`px-6 py-2 rounded-full font-label-md text-label-md transition-all duration-200 cursor-pointer flex items-center gap-2 ${activeTab === "albums" ? "bg-white shadow text-on-surface" : "text-secondary hover:text-on-surface"}`}
          >
            <span className="material-symbols-outlined text-[18px]">photo_library</span>
            Álbumes Pendientes
            {pendingAlbums.length > 0 && <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{pendingAlbums.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab("quarantine")}
            className={`px-6 py-2 rounded-full font-label-md text-label-md transition-all duration-200 cursor-pointer flex items-center gap-2 ${activeTab === "quarantine" ? "bg-white shadow text-on-surface" : "text-secondary hover:text-on-surface"}`}
          >
            <span className="material-symbols-outlined text-[18px]">warning</span>
            Cuarentena
            {files.length > 0 && <span className="bg-[#E60023] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{files.length}</span>}
          </button>
        </div>

        {loading ? (
          <div className="flex justify-center p-20">
            <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
          </div>
        ) : activeTab === "albums" ? (
          /* ── ÁLBUMES PENDIENTES ── */
          pendingAlbums.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-outline-variant rounded-3xl text-secondary">
              <span className="material-symbols-outlined text-5xl mb-3 block">check_circle</span>
              <p className="font-body-lg">No hay álbumes pendientes de aprobación.</p>
            </div>
          ) : (
            <div className="flex flex-col gap-4">
              {pendingAlbums.map((album) => (
                <div key={album.id} className="bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)] p-6 flex flex-col md:flex-row md:items-center gap-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="material-symbols-outlined text-amber-500 text-[18px]">pending</span>
                      <span className="font-label-sm text-label-sm text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full uppercase">Pendiente</span>
                    </div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface mb-1">{album.title}</h2>
                    <p className="font-body-md text-body-md text-on-surface-variant line-clamp-2">{album.description || "Sin descripción."}</p>
                    <p className="font-label-sm text-label-sm text-secondary mt-2">
                      Creado: {new Date(album.created_at).toLocaleDateString("es-CO")}
                      {" — "}
                      <span className="font-mono">{album.user_email || album.user_id.substring(0, 12) + "\u2026"}</span>
                      {album.user_name && <span className="ml-1 text-on-surface-variant">({album.user_name})</span>}
                    </p>
                  </div>
                  <div className="flex gap-3 shrink-0">
                    <button
                      onClick={() => handleAlbumDecision(album.id, "approve")}
                      disabled={decidingId === album.id}
                      className="flex items-center gap-2 bg-green-600 text-white font-label-md text-label-md px-5 py-3 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {decidingId === album.id ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : <span className="material-symbols-outlined text-[18px]">check_circle</span>}
                      Aprobar
                    </button>
                    <button
                      onClick={() => handleAlbumDecision(album.id, "reject")}
                      disabled={decidingId === album.id}
                      className="flex items-center gap-2 bg-red-600 text-white font-label-md text-label-md px-5 py-3 rounded-full hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">cancel</span>
                      Rechazar
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )
        ) : (
          /* ── CUARENTENA ── */
          files.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-outline-variant rounded-3xl text-secondary">
              <span className="material-symbols-outlined text-5xl mb-3 block">verified_user</span>
              <p className="font-body-lg">No hay archivos en cuarentena. El sistema está limpio.</p>
            </div>
          ) : (
            <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
              {files.map((file) => (
                <article key={file.id} className="break-inside-avoid bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.07)] overflow-hidden flex flex-col">
                  <div className="relative w-full aspect-[4/5] bg-surface-container-high">
                    {(file.file_type === "pdf" || file.type === "pdf") ? (
                      <div className="w-full h-full flex items-center justify-center bg-surface-container-high">
                        <span className="material-symbols-outlined text-6xl text-secondary">picture_as_pdf</span>
                      </div>
                    ) : (
                      <img className="w-full h-full object-cover" src={file.preview_url || file.url} alt="Archivo en cuarentena" />
                    )}
                    <div className="absolute top-3 left-3">
                      <span className="bg-[#E60023]/90 backdrop-blur-sm text-white px-3 py-1 rounded-full font-label-sm text-label-sm uppercase flex items-center gap-1">
                        <span className="material-symbols-outlined text-[14px]">warning</span> Cuarentena
                      </span>
                    </div>
                  </div>
                  <div className="p-4 flex flex-col gap-3">
                    <div>
                      <h2 className="font-headline-sm text-headline-sm text-on-surface">Archivo Sospechoso</h2>
                      <p className="font-label-sm text-label-sm text-secondary mt-1">
                        Álbum: <span className="font-medium text-on-surface">{file.album_title || file.album_id.substring(0, 12) + "…"}</span>
                      </p>
                      <p className="font-label-sm text-label-sm text-secondary mt-0.5">
                        Propietario: <span className="font-mono">{file.user_email || "—"}</span>
                      </p>
                      {file.analysis_metadata ? (
                        <p className="font-label-sm text-label-sm text-secondary mt-1">
                          Motivo: <span className="text-on-surface">
                            {file.analysis_metadata.pdf_details?.length
                              ? `PDF sospechoso (${file.analysis_metadata.pdf_details.length})`
                              : file.analysis_metadata.details
                                ? "Imagen con anomalias LSB/Chi/DCT"
                                : "Marcado por el analisis"}
                          </span>
                        </p>
                      ) : null}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleFileDecision(file.id, "approve")}
                        disabled={decidingId === file.id}
                        className="flex-1 bg-green-600 text-white font-label-md text-label-md py-2.5 rounded-full flex items-center justify-center gap-1 hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">check</span> Aprobar
                      </button>
                      <button
                        onClick={() => handleFileDecision(file.id, "reject")}
                        disabled={decidingId === file.id}
                        className="flex-1 bg-red-600 text-white font-label-md text-label-md py-2.5 rounded-full flex items-center justify-center gap-1 hover:bg-red-700 transition-colors disabled:opacity-50 cursor-pointer"
                      >
                        <span className="material-symbols-outlined text-[16px]">close</span> Rechazar
                      </button>
                    </div>
                    <Link href={`/quarantine?fileId=${file.id}`} className="w-full bg-secondary-fixed text-on-surface font-label-md text-label-md py-2 rounded-full flex items-center justify-center gap-1 hover:bg-secondary-fixed-dim transition-colors cursor-pointer">
                      <span className="material-symbols-outlined text-[16px]">analytics</span> Ver Análisis
                    </Link>
                  </div>
                </article>
              ))}
            </div>
          )
        )}
      </main>

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-4 pb-4">
        <div className="bg-white/95 backdrop-blur-lg flex justify-around items-center max-w-md mx-auto h-16 rounded-full shadow-[0_8px_30px_-10px_rgba(0,0,0,0.12)] border border-zinc-100">
          <Link href="/" className="flex flex-col items-center gap-0.5 p-3 rounded-full text-zinc-400 hover:text-zinc-900 transition-all cursor-pointer">
            <span className="material-symbols-outlined text-[22px]">home</span>
            <span className="text-[10px] font-medium">Inicio</span>
          </Link>
          <button
            onClick={() => setActiveTab("albums")}
            className={`flex flex-col items-center gap-0.5 p-3 rounded-full transition-all cursor-pointer ${activeTab === "albums" ? "text-[#E60023]" : "text-zinc-400"}`}
          >
            <span className="material-symbols-outlined text-[22px]" style={{fontVariationSettings: activeTab === "albums" ? "'FILL' 1" : "'FILL' 0"}}>photo_library</span>
            <span className="text-[10px] font-medium">Álbumes</span>
          </button>
          <button
            onClick={() => setActiveTab("quarantine")}
            className={`relative flex flex-col items-center gap-0.5 p-3 rounded-full transition-all cursor-pointer ${activeTab === "quarantine" ? "text-[#E60023]" : "text-zinc-400"}`}
          >
            <span className="material-symbols-outlined text-[22px]" style={{fontVariationSettings: activeTab === "quarantine" ? "'FILL' 1" : "'FILL' 0"}}>security</span>
            <span className="text-[10px] font-medium">Cuarentena</span>
            {files.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-[#E60023] rounded-full"></span>}
          </button>
          <Link href="/admin/users" className="flex flex-col items-center gap-0.5 p-3 rounded-full text-zinc-400 hover:text-zinc-900 transition-all cursor-pointer">
            <span className="material-symbols-outlined text-[22px]">manage_accounts</span>
            <span className="text-[10px] font-medium">Usuarios</span>
          </Link>
          <button
            onClick={handleLogout}
            className="flex flex-col items-center gap-0.5 p-3 rounded-full text-zinc-400 hover:text-red-500 transition-all cursor-pointer"
          >
            <span className="material-symbols-outlined text-[22px]">logout</span>
            <span className="text-[10px] font-medium">Salir</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
