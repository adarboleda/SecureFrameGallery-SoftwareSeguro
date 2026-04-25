"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useEffect, useState, Suspense } from "react";
import { fileService } from "@/services/file.service";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface FileAnalysis {
  id: string;
  url: string;
  type: string;
  preview_url?: string;
  album_id: string;
  stego_entropy?: number;
  stego_detected?: boolean;
  chi_square?: number;
  pdf_javascript?: boolean;
  pdf_attachments?: boolean;
  analysis_logs?: string[];
}

function QuarantineContent() {
  const searchParams = useSearchParams();
  const fileId = searchParams.get('fileId');
  const [fileData, setFileData] = useState<FileAnalysis | null>(null);
  const [loading, setLoading] = useState(true);
  const [supervisorId, setSupervisorId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadData() {
      if (!fileId) {
        setLoading(false);
        return;
      }
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }
        setSupervisorId(user.id);

        const files = await fileService.getQuarantinedFiles(user.id);
        const file = files.find((f: any) => f.id === fileId);
        if (file) {
          // Add some mock analysis data if not fully provided by backend yet
          setFileData({
            ...file,
            stego_entropy: file.stego_entropy || 94.2,
            stego_detected: file.stego_detected !== undefined ? file.stego_detected : true,
            analysis_logs: file.analysis_logs || [
              "Anomalous frequency distribution detected.",
              "EXIF data stripped. Standard baseline profile confirmed."
            ]
          });
        }
      } catch (err: any) {
        console.error("Error loading file data", err);
        if (err.message?.includes("403") || err.message?.includes("Access Denied")) {
           router.push("/dashboard");
        }
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, [fileId, router]);

  const handleDecision = async (action: "approve" | "reject") => {
    if (!fileData || !supervisorId) return;
    try {
      await fileService.decideFile(fileData.id, supervisorId, action);
      window.location.href = "/supervisor";
    } catch (err) {
      console.error(`Failed to ${action} file:`, err);
    }
  };

  if (loading) {
    return <div className="flex justify-center p-20"><span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span></div>;
  }

  if (!fileData) {
    return (
      <div className="flex flex-col items-center justify-center p-20 text-center">
        <span className="material-symbols-outlined text-4xl text-error mb-4">error</span>
        <h2 className="font-headline-md text-headline-md">Archivo no encontrado</h2>
        <Link href="/supervisor" className="mt-4 text-primary-container hover:underline">Volver a Aprobaciones</Link>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-12 gap-lg">
      {/* Header Section */}
      <div className="col-span-1 md:col-span-12 flex flex-col md:flex-row justify-between items-start md:items-end mb-md gap-md">
        <div>
          <h2 className="font-display-lg text-display-lg text-on-background mb-unit">Reporte de Análisis</h2>
          <p className="font-body-lg text-body-lg text-secondary">El contenido marcado requiere revisión manual.</p>
        </div>
        <div className="flex items-center gap-sm bg-[#F0F0F0] px-4 py-2 rounded-full">
          <span className="material-symbols-outlined text-secondary text-lg">warning</span>
          <span className="font-label-md text-label-md text-on-surface">Prioridad Alta</span>
        </div>
      </div>

      {/* Image Container (Left Column) */}
      <div className="col-span-1 md:col-span-7 flex flex-col gap-md">
        <div className="relative bg-surface-container-lowest rounded-xl overflow-hidden shadow-[0_8px_30px_-10px_rgba(0,0,0,0.08)] group flex justify-center items-center min-h-[400px]">
          {fileData.type === "pdf" ? (
            <iframe src={`${fileData.preview_url || fileData.url}#view=FitH&toolbar=0&navpanes=0`} className="w-full h-[600px] border-0" title="PDF Preview"></iframe>
          ) : (
            <img className="w-full h-auto object-contain max-h-[618px]" src={fileData.preview_url || fileData.url} alt="Flagged Content" />
          )}
          {/* Overlay Actions */}
          <div className="absolute top-4 right-4 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
            <button className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-on-surface hover:bg-white transition-colors shadow-sm cursor-pointer">
              <span className="material-symbols-outlined text-xl">zoom_in</span>
            </button>
            <a href={fileData.url} download className="w-10 h-10 rounded-full bg-white/90 backdrop-blur-sm flex items-center justify-center text-on-surface hover:bg-white transition-colors shadow-sm cursor-pointer">
              <span className="material-symbols-outlined text-xl">download</span>
            </a>
          </div>
        </div>
      </div>

      {/* Analysis Data (Right Column) */}
      <div className="col-span-1 md:col-span-5 flex flex-col gap-lg">
        {/* Key Metrics Bento */}
        <div className="grid grid-cols-2 gap-sm">
          {/* Metric 1 */}
          <div className="bg-surface-container-lowest p-md rounded-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)] border border-[#F0F0F0]/50 flex flex-col gap-sm hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.06)] transition-shadow">
            <div className="flex items-center gap-2 text-secondary">
              <span className="material-symbols-outlined text-sm">analytics</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider">Entropía</span>
            </div>
            <div className="font-headline-md text-headline-md text-error">{fileData.stego_entropy?.toFixed(1) || 'N/A'}%</div>
            <div className="w-full bg-[#F0F0F0] rounded-full h-1 mt-auto">
              <div className="bg-error h-1 rounded-full" style={{ width: `${fileData.stego_entropy || 0}%` }}></div>
            </div>
          </div>
          
          {/* Metric 2 */}
          <div className="bg-surface-container-lowest p-md rounded-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)] border border-[#F0F0F0]/50 flex flex-col gap-sm hover:shadow-[0_8px_25px_-5px_rgba(0,0,0,0.06)] transition-shadow">
            <div className="flex items-center gap-2 text-secondary">
              <span className="material-symbols-outlined text-sm">flag</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider">Detección</span>
            </div>
            <div className="font-headline-sm text-headline-sm text-on-surface leading-tight">
              {fileData.type === 'pdf' ? (fileData.pdf_javascript ? 'JS Malicioso en PDF' : 'PDF Sospechoso') : (fileData.stego_detected ? 'Esteganografía LSB' : 'Datos Anómalos')}
            </div>
          </div>
          
          {/* Metric 3 */}
          <div className="bg-surface-container-lowest p-md rounded-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)] border border-[#F0F0F0]/50 flex flex-col gap-sm col-span-2">
            <div className="flex items-center gap-2 text-secondary mb-unit">
              <span className="material-symbols-outlined text-sm">fingerprint</span>
              <span className="font-label-sm text-label-sm uppercase tracking-wider">Firmas de Archivo</span>
            </div>
            <div className="grid grid-cols-2 gap-x-4 gap-y-2">
              <div>
                <span className="block font-label-sm text-label-sm text-secondary">ID</span>
                <span className="font-body-md text-body-md text-on-surface truncate block" title={fileData.id}>{fileData.id.substring(0, 15)}...</span>
              </div>
              <div>
                <span className="block font-label-sm text-label-sm text-secondary">Tipo</span>
                <span className="font-body-md text-body-md text-on-surface uppercase">{fileData.type}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Details Section */}
        <div className="bg-surface-container-lowest p-lg rounded-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.03)] border border-[#F0F0F0]/50 flex flex-col gap-md">
          <h3 className="font-headline-sm text-headline-sm text-on-background border-b border-[#F0F0F0] pb-sm">Registros de Análisis</h3>
          <div className="space-y-4">
            {fileData.analysis_logs?.map((log, idx) => (
              <div key={idx} className="flex items-start gap-3">
                <span className={`material-symbols-outlined ${idx === 0 ? 'text-error' : 'text-[#0079b6]'} text-lg mt-1`}>
                  {idx === 0 ? 'error' : 'info'}
                </span>
                <div>
                  <p className="font-body-md text-body-md text-on-surface">{log}</p>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-sm flex flex-wrap gap-2">
            <span className="px-3 py-1 bg-[#F0F0F0] rounded-full font-label-sm text-label-sm text-on-surface">#{fileData.type === 'pdf' ? 'script-malicioso' : 'estego'}</span>
            <span className="px-3 py-1 bg-[#F0F0F0] rounded-full font-label-sm text-label-sm text-on-surface">#revision-manual</span>
            <span className="px-3 py-1 bg-surface-dim rounded-full font-label-sm text-label-sm text-primary">#alta-confianza</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col gap-sm mt-auto">
          <button onClick={() => handleDecision("reject")} className="w-full bg-primary-container text-on-primary py-4 rounded-full font-label-md text-label-md hover:bg-surface-tint transition-colors shadow-[0_4px_14px_0_rgba(230,0,35,0.2)] flex items-center justify-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined text-lg">block</span>
            Rechazar Archivo
          </button>
          <button onClick={() => handleDecision("approve")} className="w-full bg-[#F0F0F0] text-on-surface py-4 rounded-full font-label-md text-label-md hover:bg-[#E5E5E5] transition-colors flex items-center justify-center gap-2 cursor-pointer">
            <span className="material-symbols-outlined text-lg">check_circle</span>
            Aprobar (Falso Positivo)
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Quarantine() {
  const router = useRouter();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/");
  };

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md text-body-md antialiased pb-24 pt-20">
      {/* TopAppBar */}
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] border-b-0 hidden md:flex">
        <div className="flex items-center justify-between px-6 py-4 w-full max-w-7xl mx-auto">
          <div className="flex items-center gap-4">
            <Link href="/supervisor">
              <span className="material-symbols-outlined text-[#E60023] text-2xl cursor-pointer">arrow_back</span>
            </Link>
            <h1 className="text-[#E60023] font-bold text-2xl tracking-tighter font-display-lg">SecureFrame</h1>
          </div>
          <nav className="flex items-center gap-6">
            <Link href="/supervisor" className="text-zinc-500 hover:bg-zinc-100 transition-colors duration-200 px-4 py-2 rounded-full font-label-md text-label-md">Aprobaciones</Link>
            <span className="text-zinc-900 bg-zinc-100 transition-colors duration-200 px-4 py-2 rounded-full font-label-md text-label-md">Análisis de Cuarentena</span>
          </nav>
          <button onClick={handleLogout} className="h-10 w-10 rounded-full bg-surface-variant overflow-hidden flex items-center justify-center hover:bg-red-50 text-on-surface hover:text-red-500 transition-colors duration-200 cursor-pointer" title="Cerrar sesión">
            <span className="material-symbols-outlined">logout</span>
          </button>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-container-margin py-lg">
        <Suspense fallback={<div className="flex justify-center p-20"><span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span></div>}>
          <QuarantineContent />
        </Suspense>
      </main>

      {/* BottomNavBar (Mobile Only) */}
      <nav className="fixed bottom-0 left-0 right-0 z-50 w-full px-4 pb-6 md:hidden">
        <div className="bg-white/95 backdrop-blur-lg flex justify-around items-center max-w-md mx-auto h-16 rounded-full shadow-[0_8px_30px_-10px_rgba(0,0,0,0.1)] border border-zinc-100">
          <Link href="/supervisor">
            <button className="text-zinc-400 hover:bg-zinc-100 rounded-full p-3 transition-colors duration-200 cursor-pointer flex flex-col items-center justify-center">
              <span className="material-symbols-outlined">arrow_back</span>
            </button>
          </Link>
          <button className="text-zinc-900 scale-110 p-3 transition-all duration-300 ease-out cursor-pointer flex flex-col items-center justify-center">
            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>admin_panel_settings</span>
          </button>
        </div>
      </nav>
    </div>
  );
}
