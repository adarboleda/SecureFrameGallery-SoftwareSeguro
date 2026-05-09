"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fileService } from "@/services/file.service";
import { albumService } from "@/services/album.service";
import { apiFetch } from "@/services/api";
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
  analysis_metadata?: any;
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

interface DecisionHistoryAlbum {
  id: string;
  title: string;
  description: string;
  privacy: string;
  status: string;
  created_at: string;
  decision_at: string | null;
  decision_action: string | null;
  supervisor_email: string | null;
  owner_email: string | null;
  audit_reason: string | null;
  files_count: number;
}

interface DecisionHistoryFile {
  id: string;
  album_id: string;
  album_title: string;
  file_type: string;
  status: string;
  preview_url: string | null;
  created_at: string;
  decision_at: string;
  decision_action: string;
  supervisor_email: string | null;
  owner_email: string | null;
  audit_reason: string | null;
  analysis_metadata: any;
}

export default function SupervisorDashboard() {
  const [files, setFiles] = useState<QuarantinedFile[]>([]);
  const [pendingAlbums, setPendingAlbums] = useState<PendingAlbum[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyAlbums, setHistoryAlbums] = useState<DecisionHistoryAlbum[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyFetched, setHistoryFetched] = useState(false);
  const [historyType, setHistoryType] = useState<'albums' | 'files'>('albums');
  const [historySearch, setHistorySearch] = useState<string>('');
  const [historyPage, setHistoryPage] = useState<number>(1);
  const [historyFiles, setHistoryFiles] = useState<DecisionHistoryFile[]>([]);
  const [supervisorId, setSupervisorId] = useState<string | null>(null);
  const [supervisorEmail, setSupervisorEmail] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'albums' | 'quarantine' | 'history'>('albums');
  const [quarantineSearch, setQuarantineSearch] = useState<string>('');
  const [quarantinePage, setQuarantinePage] = useState<number>(1);
  const [decidingId, setDecidingId] = useState<string | null>(null);
  const [decisionModal, setDecisionModal] = useState<{ type: 'album' | 'file'; id: string; action: 'approve' | 'reject' } | null>(null);
  const [decisionReason, setDecisionReason] = useState<string>('');
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
        const roleRes = await apiFetch(`/api/auth/role/${user.id}`);
        if (roleRes) {
          const { role } = roleRes;
          if (role !== "supervisor") {
            router.replace("/dashboard");
            return;
          }
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
              const { users } = await apiFetch(`/api/admin/users?supervisor_id=${user.id}`);
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
            const { users } = await apiFetch(`/api/admin/users?supervisor_id=${user.id}`);
            // Fetch album info for each file
            const enrichedFiles = await Promise.all(rawFiles.map(async (f) => {
              try {
                const albumData = await apiFetch(`/api/albums/${f.album_id}?supervisor_id=${user.id}`);
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

  // Load decision history (lazy — only when the tab is first opened)
  useEffect(() => {
    if (activeTab !== 'history' || historyFetched) return;

    async function loadHistory() {
      setHistoryLoading(true);
      try {
        const data = await apiFetch('/api/supervisor/decision-history');
        setHistoryAlbums(data.history_albums || []);
        setHistoryFiles(data.history_files || []);
        setHistoryFetched(true);
      } catch (err) {
        console.error('Error loading decision history', err);
      } finally {
        setHistoryLoading(false);
      }
    }

    loadHistory();
  }, [activeTab, historyFetched]);

  const openDecisionModal = (type: 'album' | 'file', id: string, action: 'approve' | 'reject') => {
    setDecisionReason("");
    setDecisionModal({ type, id, action });
  };

  const closeDecisionModal = () => {
    setDecisionModal(null);
    setDecisionReason("");
  };

  const submitDecision = async () => {
    if (!supervisorId || !decisionModal) return;
    setDecidingId(decisionModal.id);
    try {
      if (decisionModal.type === "album") {
        await albumService.decideAlbum(decisionModal.id, supervisorId, decisionModal.action, decisionReason.trim());
        setPendingAlbums(prev => prev.filter(a => a.id !== decisionModal.id));
      } else {
        await fileService.decideFile(decisionModal.id, supervisorId, decisionModal.action, decisionReason.trim());
        setFiles(prev => prev.filter(f => f.id !== decisionModal.id));
      }
      closeDecisionModal();
    } catch (err) {
      console.error(`Error al ${decisionModal.action} ${decisionModal.type}`, err);
    } finally {
      setDecidingId(null);
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push('/');
  };

  function formatDate(iso: string | null) {
    if (!iso) return '—';
    return new Date(iso).toLocaleDateString('es-CO', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  }

  const filteredQuarantine = files.filter((file) => {
    const term = quarantineSearch.trim().toLowerCase();
    if (!term) return true;
    const album = (file.album_title || "").toLowerCase();
    const owner = (file.user_email || "").toLowerCase();
    return album.includes(term) || owner.includes(term);
  });

  const quarantinePageSize = 9;
  const quarantineTotalPages = Math.max(1, Math.ceil(filteredQuarantine.length / quarantinePageSize));
  const quarantineSlice = filteredQuarantine.slice(
    (quarantinePage - 1) * quarantinePageSize,
    quarantinePage * quarantinePageSize
  );

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md antialiased">
      {/* Header */}
      <header className="fixed top-0 w-full z-50 bg-white/95 backdrop-blur-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.07)]">
        <div className="flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-[#E60023]" style={{ fontVariationSettings: "'FILL' 1" }}>admin_panel_settings</span>
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
            <span className="material-symbols-outlined text-amber-500 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
            <p className="font-headline-lg text-headline-lg text-on-surface mt-1">{loading ? "—" : pendingAlbums.length}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Álbumes pendientes</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)] flex flex-col gap-1">
            <span className="material-symbols-outlined text-[#E60023] text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>security</span>
            <p className="font-headline-lg text-headline-lg text-on-surface mt-1">{loading ? "—" : files.length}</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Archivos en cuarentena</p>
          </div>
          <div className="bg-surface-container-lowest rounded-xl p-5 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)] flex flex-col gap-1 col-span-2 md:col-span-1">
            <span className="material-symbols-outlined text-green-600 text-3xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified_user</span>
            <p className="font-headline-lg text-headline-lg text-on-surface mt-1">Activo</p>
            <p className="font-body-sm text-body-sm text-on-surface-variant">Estado del sistema</p>
          </div>
        </section>

        {/* Tab Switcher */}
        <div className="flex gap-2 mb-6 bg-secondary-fixed p-1 rounded-full w-fit">
          <button
            onClick={() => setActiveTab('albums')}
            className={`px-6 py-2 rounded-full font-label-md text-label-md transition-all duration-200 cursor-pointer flex items-center gap-2 ${activeTab === 'albums' ? 'bg-white shadow text-on-surface' : 'text-secondary hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined text-[18px]">photo_library</span>
            Álbumes Pendientes
            {pendingAlbums.length > 0 && <span className="bg-amber-500 text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{pendingAlbums.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('quarantine')}
            className={`px-6 py-2 rounded-full font-label-md text-label-md transition-all duration-200 cursor-pointer flex items-center gap-2 ${activeTab === 'quarantine' ? 'bg-white shadow text-on-surface' : 'text-secondary hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined text-[18px]">warning</span>
            Cuarentena
            {files.length > 0 && <span className="bg-[#E60023] text-white text-[11px] font-bold px-2 py-0.5 rounded-full">{files.length}</span>}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`px-6 py-2 rounded-full font-label-md text-label-md transition-all duration-200 cursor-pointer flex items-center gap-2 ${activeTab === 'history' ? 'bg-white shadow text-on-surface' : 'text-secondary hover:text-on-surface'}`}
          >
            <span className="material-symbols-outlined text-[18px]">history</span>
            Historial
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
                      onClick={() => openDecisionModal("album", album.id, "approve")}
                      disabled={decidingId === album.id}
                      className="flex items-center gap-2 bg-green-600 text-white font-label-md text-label-md px-5 py-3 rounded-full hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
                    >
                      {decidingId === album.id ? <span className="material-symbols-outlined animate-spin text-[18px]">refresh</span> : <span className="material-symbols-outlined text-[18px]">check_circle</span>}
                      Aprobar
                    </button>
                    <button
                      onClick={() => openDecisionModal("album", album.id, "reject")}
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
        ) : activeTab === 'history' ? (
          /* ── HISTORIAL DE DECISIONES ── */
          historyLoading ? (
            <div className="flex justify-center p-20">
              <span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span>
            </div>
          ) : (() => {
            // ALBUMS
            const filteredHistoryAlbums = historyAlbums.filter((a) => {
              const term = historySearch.trim().toLowerCase();
              if (!term) return true;
              return (
                a.title.toLowerCase().includes(term) ||
                (a.owner_email ?? '').toLowerCase().includes(term) ||
                (a.supervisor_email ?? '').toLowerCase().includes(term)
              );
            });
            const historyAlbumsPageSize = 8;
            const historyAlbumsTotalPages = Math.max(1, Math.ceil(filteredHistoryAlbums.length / historyAlbumsPageSize));
            const historyAlbumsSlice = filteredHistoryAlbums.slice(
              (historyPage - 1) * historyAlbumsPageSize,
              historyPage * historyAlbumsPageSize,
            );

            // FILES
            const filteredHistoryFiles = historyFiles.filter((f) => {
              const term = historySearch.trim().toLowerCase();
              if (!term) return true;
              return (
                (f.album_title || '').toLowerCase().includes(term) ||
                (f.owner_email ?? '').toLowerCase().includes(term) ||
                (f.supervisor_email ?? '').toLowerCase().includes(term)
              );
            });
            const historyFilesPageSize = 8;
            const historyFilesTotalPages = Math.max(1, Math.ceil(filteredHistoryFiles.length / historyFilesPageSize));
            const historyFilesSlice = filteredHistoryFiles.slice(
              (historyPage - 1) * historyFilesPageSize,
              historyPage * historyFilesPageSize,
            );

            const isAlbums = historyType === 'albums';
            const totalResults = isAlbums ? filteredHistoryAlbums.length : filteredHistoryFiles.length;
            const totalPages = isAlbums ? historyAlbumsTotalPages : historyFilesTotalPages;

            return (
              <div className="space-y-5">
                {/* Sub-tab Switcher for Albums/Files */}
                <div className="flex gap-2 bg-surface-container p-1 rounded-full w-fit">
                  <button
                    onClick={() => { setHistoryType('albums'); setHistoryPage(1); }}
                    className={`px-4 py-1.5 rounded-full font-label-md text-label-md transition-all duration-200 cursor-pointer flex items-center gap-1 ${historyType === 'albums' ? 'bg-white shadow text-on-surface' : 'text-secondary hover:text-on-surface'}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">photo_library</span>
                    Álbumes
                  </button>
                  <button
                    onClick={() => { setHistoryType('files'); setHistoryPage(1); }}
                    className={`px-4 py-1.5 rounded-full font-label-md text-label-md transition-all duration-200 cursor-pointer flex items-center gap-1 ${historyType === 'files' ? 'bg-white shadow text-on-surface' : 'text-secondary hover:text-on-surface'}`}
                  >
                    <span className="material-symbols-outlined text-[16px]">insert_drive_file</span>
                    Archivos
                  </button>
                </div>

                {/* Search + counter */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="relative w-full sm:grow sm:basis-0 sm:min-w-[320px]">
                    <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">search</span>
                    <input
                      value={historySearch}
                      onChange={(e) => {
                        setHistorySearch(e.target.value);
                        setHistoryPage(1);
                      }}
                      className="w-full pl-10 pr-4 py-2.5 rounded-full bg-surface-container-lowest border border-outline-variant focus:ring-2 focus:ring-primary-container outline-none text-sm"
                      placeholder={`Filtrar por título, propietario o supervisor...`}
                      type="text"
                    />
                  </div>
                  <div className="flex items-center gap-2 text-sm text-secondary sm:shrink-0">
                    <span>{totalResults} resultados</span>
                    <span>•</span>
                    <span>Página {historyPage} de {totalPages}</span>
                  </div>
                </div>

                {/* Cards */}
                {isAlbums ? (
                  /* ALBUMS VIEW */
                  historyAlbumsSlice.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-outline-variant rounded-3xl text-secondary">
                      <span className="material-symbols-outlined text-5xl mb-3 block">history</span>
                      <p className="font-body-lg">No hay historial de decisiones de álbumes aún.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {historyAlbumsSlice.map((album) => {
                        const isApproved = album.status === 'approved' || album.decision_action === 'approve';
                        const cardBorder = isApproved ? 'border-green-100' : 'border-red-100';
                        const iconBg = isApproved ? 'bg-green-50' : 'bg-red-50';
                        const iconColor = isApproved ? 'text-green-600' : 'text-red-600';
                        const iconName = isApproved ? 'verified' : 'cancel';

                        return (
                          <div key={album.id} className={`bg-surface-container-lowest rounded-2xl p-5 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)] border ${cardBorder} flex flex-col sm:flex-row sm:items-start gap-4`}>
                            {/* Icon */}
                            <div className={`shrink-0 w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center`}>
                              <span className={`material-symbols-outlined ${iconColor} text-2xl`} style={{ fontVariationSettings: "'FILL' 1" }}>{iconName}</span>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="font-headline-sm text-headline-sm text-on-surface truncate">{album.title}</h3>
                                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full ${album.privacy === 'public' ? 'bg-blue-50 text-blue-700' : 'bg-zinc-100 text-zinc-600'
                                  }`}>
                                  {album.privacy === 'public' ? 'Público' : 'Privado'}
                                </span>
                                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase ${isApproved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                  {isApproved ? 'Aprobado' : 'Rechazado'}
                                </span>
                              </div>

                              {album.description && (
                                <p className="text-sm text-on-surface-variant mb-3 line-clamp-2">{album.description}</p>
                              )}

                              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-secondary">
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[15px]">person</span>
                                  <span>Propietario: <span className="font-medium text-on-surface font-mono">{album.owner_email ?? '—'}</span></span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[15px]">admin_panel_settings</span>
                                  <span>Decisión por: <span className="font-medium text-on-surface">{album.supervisor_email ?? 'Supervisor desconocido'}</span></span>
                                </div>
                                {album.decision_at && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[15px]">event</span>
                                    <span>Decidido el: <span className="font-medium text-on-surface">{formatDate(album.decision_at)}</span></span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[15px]">image</span>
                                  <span><span className="font-medium text-on-surface">{album.files_count}</span> {album.files_count === 1 ? 'archivo' : 'archivos'}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                                  <span>Creado: {formatDate(album.created_at)}</span>
                                </div>
                              </div>

                              {album.audit_reason && (
                                <div className={`mt-3 ${isApproved ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'} text-xs px-3 py-2 rounded-lg border`}>
                                  <span className="font-semibold">Nota del supervisor: </span>{album.audit_reason}
                                </div>
                              )}
                            </div>
                          </div>
                        )
                      })}
                    </div>
                  )
                ) : (
                  /* FILES VIEW */
                  historyFilesSlice.length === 0 ? (
                    <div className="py-20 text-center border-2 border-dashed border-outline-variant rounded-3xl text-secondary">
                      <span className="material-symbols-outlined text-5xl mb-3 block">history</span>
                      <p className="font-body-lg">No hay historial de decisiones de archivos aún.</p>
                    </div>
                  ) : (
                    <div className="flex flex-col gap-4">
                      {historyFilesSlice.map((file) => {
                        const isApproved = file.status === 'clean' || file.decision_action === 'approve';
                        const cardBorder = isApproved ? 'border-green-100' : 'border-red-100';
                        const iconBg = isApproved ? 'bg-green-50' : 'bg-red-50';
                        const iconColor = isApproved ? 'text-green-600' : 'text-red-600';
                        const iconName = isApproved ? 'verified' : 'cancel';

                        return (
                          <div key={file.id} className={`bg-surface-container-lowest rounded-2xl p-5 shadow-[0_4px_20px_-5px_rgba(0,0,0,0.06)] border ${cardBorder} flex flex-col sm:flex-row sm:items-start gap-4`}>
                            {/* Icon / Thumbnail */}
                            <div className={`shrink-0 w-16 h-16 rounded-xl ${iconBg} border ${cardBorder} flex items-center justify-center overflow-hidden relative bg-surface-container-high`}>
                              {file.file_type === "pdf" ? (
                                <span className="material-symbols-outlined text-3xl text-secondary">picture_as_pdf</span>
                              ) : (
                                file.preview_url ? (
                                  <img className="w-full h-full object-cover" src={file.preview_url} alt="Archivo historial" />
                                ) : (
                                  <span className={`material-symbols-outlined ${iconColor} text-2xl`} style={{ fontVariationSettings: "'FILL' 1" }}>image</span>
                                )
                              )}
                              {/* Overlay tiny status icon */}
                              <div className={`absolute -bottom-1 -right-1 w-6 h-6 rounded-full ${isApproved ? 'bg-green-100' : 'bg-red-100'} flex items-center justify-center border-2 border-white`}>
                                <span className={`material-symbols-outlined ${iconColor} text-[14px]`} style={{ fontVariationSettings: "'FILL' 1" }}>{iconName}</span>
                              </div>
                            </div>

                            {/* Content */}
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <h3 className="font-headline-sm text-headline-sm text-on-surface truncate">
                                  {file.file_type === 'pdf' ? 'Documento PDF' : 'Imagen'}
                                </h3>
                                <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 text-zinc-600 truncate max-w-[200px]">
                                  Álbum: {file.album_title || file.album_id.substring(0, 8)}
                                </span>
                                <span className={`text-xs font-semibold px-2.5 py-0.5 rounded-full uppercase ${isApproved ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                  }`}>
                                  {isApproved ? 'Aprobado' : 'Rechazado'}
                                </span>
                              </div>

                              <div className="flex flex-wrap gap-x-6 gap-y-2 text-xs text-secondary mt-2">
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[15px]">person</span>
                                  <span>Propietario: <span className="font-medium text-on-surface font-mono">{file.owner_email ?? '—'}</span></span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[15px]">admin_panel_settings</span>
                                  <span>Decisión por: <span className="font-medium text-on-surface">{file.supervisor_email ?? 'Supervisor desconocido'}</span></span>
                                </div>
                                {file.decision_at && (
                                  <div className="flex items-center gap-1.5">
                                    <span className="material-symbols-outlined text-[15px]">event</span>
                                    <span>Decidido el: <span className="font-medium text-on-surface">{formatDate(file.decision_at)}</span></span>
                                  </div>
                                )}
                                <div className="flex items-center gap-1.5">
                                  <span className="material-symbols-outlined text-[15px]">calendar_today</span>
                                  <span>Subido: {formatDate(file.created_at)}</span>
                                </div>
                              </div>

                              {file.audit_reason && (
                                <div className={`mt-3 ${isApproved ? 'bg-green-50 text-green-800 border-green-200' : 'bg-red-50 text-red-800 border-red-200'} text-xs px-3 py-2 rounded-lg border`}>
                                  <span className="font-semibold">Nota del supervisor: </span>{file.audit_reason}
                                </div>
                              )}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )
                )}

                {/* Pagination controls */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-center gap-3 pt-2">
                    <button
                      onClick={() => setHistoryPage((p) => Math.max(1, p - 1))}
                      disabled={historyPage === 1}
                      className="px-4 py-2 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      Anterior
                    </button>
                    <div className="flex items-center gap-1">
                      {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                        <button
                          key={p}
                          onClick={() => setHistoryPage(p)}
                          className={`w-9 h-9 rounded-full text-sm font-semibold transition-colors cursor-pointer ${p === historyPage
                              ? 'bg-[#E60023] text-white'
                              : 'bg-surface-container text-on-surface hover:bg-surface-container-high'
                            }`}
                        >
                          {p}
                        </button>
                      ))}
                    </div>
                    <button
                      onClick={() => setHistoryPage((p) => Math.min(totalPages, p + 1))}
                      disabled={historyPage === totalPages}
                      className="px-4 py-2 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-40 cursor-pointer"
                    >
                      Siguiente
                    </button>
                  </div>
                )}
              </div>
            );
          })()
        ) : (
          /* ── CUARENTENA ── */
          files.length === 0 ? (
            <div className="py-20 text-center border-2 border-dashed border-outline-variant rounded-3xl text-secondary">
              <span className="material-symbols-outlined text-5xl mb-3 block">verified_user</span>
              <p className="font-body-lg">No hay archivos en cuarentena. El sistema está limpio.</p>
            </div>
          ) : (
            <div className="space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 w-full">
                <div className="relative w-full sm:grow sm:basis-0 sm:min-w-[320px]">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-secondary text-[18px]">search</span>
                  <input
                    value={quarantineSearch}
                    onChange={(e) => {
                      setQuarantineSearch(e.target.value);
                      setQuarantinePage(1);
                    }}
                    className="w-full pl-10 pr-4 py-2.5 rounded-full bg-surface-container-lowest border border-outline-variant focus:ring-2 focus:ring-primary-container outline-none text-sm"
                    placeholder="Filtrar por álbum o propietario"
                    type="text"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-secondary sm:shrink-0">
                  <span>{filteredQuarantine.length} resultados</span>
                  <span className="text-secondary">•</span>
                  <span>Página {quarantinePage} de {quarantineTotalPages}</span>
                </div>
              </div>

              <div className="columns-1 sm:columns-2 lg:columns-3 gap-5 space-y-5">
                {quarantineSlice.map((file) => (
                  <article key={file.id} className="break-inside-avoid bg-surface-container-lowest rounded-2xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.07)] overflow-hidden flex flex-col">
                    <div className="relative w-full aspect-[4/3] bg-surface-container-high">
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
                          onClick={() => openDecisionModal("file", file.id, "approve")}
                          disabled={decidingId === file.id}
                          className="flex-1 bg-green-600 text-white font-label-md text-label-md py-2.5 rounded-full flex items-center justify-center gap-1 hover:bg-green-700 transition-colors disabled:opacity-50 cursor-pointer"
                        >
                          <span className="material-symbols-outlined text-[16px]">check</span> Aprobar
                        </button>
                        <button
                          onClick={() => openDecisionModal("file", file.id, "reject")}
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

              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={() => setQuarantinePage((p) => Math.max(1, p - 1))}
                  disabled={quarantinePage === 1}
                  className="px-4 py-2 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Anterior
                </button>
                <button
                  onClick={() => setQuarantinePage((p) => Math.min(quarantineTotalPages, p + 1))}
                  disabled={quarantinePage === quarantineTotalPages}
                  className="px-4 py-2 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors disabled:opacity-50 cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            </div>
          )
        )}
      </main>

      {decisionModal && (
        <div className="fixed inset-0 z-[100] bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-[min(92vw,520px)] min-w-[280px] bg-surface-container-lowest rounded-2xl shadow-[0_20px_60px_-25px_rgba(0,0,0,0.4)] p-6">
            <h3 className="font-headline-sm text-headline-sm text-on-surface mb-2">
              {decisionModal.action === "approve" ? "Aprobar" : "Rechazar"} {decisionModal.type === "album" ? "álbum" : "archivo"}
            </h3>
            <p className="text-secondary text-sm mb-4">Motivo (opcional)</p>
            <textarea
              className="w-full bg-secondary-fixed border-none rounded-xl px-4 py-3 text-sm text-on-surface focus:ring-2 focus:ring-primary-container outline-none resize-none"
              rows={3}
              placeholder="Escribe una breve justificación"
              value={decisionReason}
              onChange={(e) => setDecisionReason(e.target.value)}
            />
            <div className="mt-5 flex gap-3 justify-end">
              <button
                onClick={closeDecisionModal}
                className="px-4 py-2 rounded-full bg-surface-container text-on-surface hover:bg-surface-container-high transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={submitDecision}
                className={`px-4 py-2 rounded-full text-white transition-colors cursor-pointer ${decisionModal.action === "approve" ? "bg-green-600 hover:bg-green-700" : "bg-red-600 hover:bg-red-700"}`}
              >
                Confirmar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Navigation (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 md:hidden px-4 pb-4">
        <div className="bg-white/95 backdrop-blur-lg flex justify-around items-center max-w-md mx-auto h-16 rounded-full shadow-[0_8px_30px_-10px_rgba(0,0,0,0.12)] border border-zinc-100">
          <Link href="/" className="flex flex-col items-center gap-0.5 p-3 rounded-full text-zinc-400 hover:text-zinc-900 transition-all cursor-pointer">
            <span className="material-symbols-outlined text-[22px]">home</span>
            <span className="text-[10px] font-medium">Inicio</span>
          </Link>
          <button
            onClick={() => setActiveTab('albums')}
            className={`flex flex-col items-center gap-0.5 p-3 rounded-full transition-all cursor-pointer ${activeTab === 'albums' ? 'text-[#E60023]' : 'text-zinc-400'}`}
          >
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: activeTab === 'albums' ? "'FILL' 1" : "'FILL' 0" }}>photo_library</span>
            <span className="text-[10px] font-medium">Álbumes</span>
          </button>
          <button
            onClick={() => setActiveTab('quarantine')}
            className={`relative flex flex-col items-center gap-0.5 p-3 rounded-full transition-all cursor-pointer ${activeTab === 'quarantine' ? 'text-[#E60023]' : 'text-zinc-400'}`}
          >
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: activeTab === 'quarantine' ? "'FILL' 1" : "'FILL' 0" }}>security</span>
            <span className="text-[10px] font-medium">Cuarentena</span>
            {files.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-[#E60023] rounded-full"></span>}
          </button>
          <button
            onClick={() => setActiveTab('history')}
            className={`flex flex-col items-center gap-0.5 p-3 rounded-full transition-all cursor-pointer ${activeTab === 'history' ? 'text-[#E60023]' : 'text-zinc-400'}`}
          >
            <span className="material-symbols-outlined text-[22px]" style={{ fontVariationSettings: activeTab === 'history' ? "'FILL' 1" : "'FILL' 0" }}>history</span>
            <span className="text-[10px] font-medium">Historial</span>
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
