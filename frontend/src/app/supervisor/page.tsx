"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { fileService } from "@/services/file.service";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";

interface QuarantinedFile {
  id: string;
  url: string;
  type: string;
  preview_url?: string;
  album_id: string;
}

export default function SupervisorApprovals() {
  const [files, setFiles] = useState<QuarantinedFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [supervisorId, setSupervisorId] = useState<string | null>(null);
  const router = useRouter();

  useEffect(() => {
    async function loadQuarantined() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
          router.push("/login");
          return;
        }
        setSupervisorId(user.id);
        
        const data = await fileService.getQuarantinedFiles(user.id);
        setFiles(data || []);
      } catch (err: any) {
        console.error("Error loading quarantined files", err);
        if (err.message?.includes("403") || err.message?.includes("Access Denied")) {
           router.push("/dashboard"); // No es supervisor
        }
      } finally {
        setLoading(false);
      }
    }
    loadQuarantined();
  }, [router]);

  const handleDecision = async (fileId: string, action: "approve" | "reject") => {
    if (!supervisorId) return;
    try {
      await fileService.decideFile(fileId, supervisorId, action);
      setFiles(files.filter(f => f.id !== fileId));
    } catch (err) {
      console.error(`Failed to ${action} file:`, err);
    }
  };

  return (
    <div className="bg-background text-on-background min-h-screen font-body-md antialiased pb-24 md:pb-0">
      <header className="fixed top-0 w-full z-50 bg-white/90 backdrop-blur-xl shadow-[0_4px_20px_-5px_rgba(0,0,0,0.05)] flex items-center justify-between px-6 py-4">
        <div className="flex items-center gap-sm">
          <Link href="/">
            <button className="flex items-center gap-sm cursor-pointer">
              <span className="material-symbols-outlined text-[#E60023]">potted_plant</span>
              <span className="text-[#E60023] font-bold text-2xl tracking-tighter">Supervisor</span>
            </button>
          </Link>
        </div>
        <div className="h-10 w-10 rounded-full bg-surface-variant overflow-hidden flex items-center justify-center">
          <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 1"}}>admin_panel_settings</span>
        </div>
      </header>

      <main className="pt-[100px] pb-[100px] px-container-margin max-w-7xl mx-auto">
        <div className="mb-xl flex items-end justify-between">
          <div>
            <h1 className="font-display-lg text-display-lg text-on-background mb-unit">Aprobaciones Pendientes</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">Revisar archivos en cuarentena por análisis de seguridad</p>
          </div>
          <div className="hidden md:flex gap-sm">
            <span className="inline-flex items-center justify-center px-4 py-2 bg-surface-container-high rounded-full font-label-md text-label-md text-on-surface">Filtrar</span>
          </div>
        </div>

        {loading ? (
          <div className="flex justify-center p-20"><span className="material-symbols-outlined animate-spin text-primary text-4xl">refresh</span></div>
        ) : files.length === 0 ? (
          <div className="col-span-full py-20 text-center border-2 border-dashed border-outline-variant rounded-[32px] text-secondary">
            <span className="material-symbols-outlined text-4xl mb-2">check_circle</span>
            <p>No hay aprobaciones pendientes. Todos los archivos están limpios.</p>
          </div>
        ) : (
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-grid-gutter space-y-grid-gutter">
            {files.map((file) => (
              <article key={file.id} className="break-inside-avoid bg-surface-container-lowest rounded-xl shadow-[0_8px_30px_-12px_rgba(0,0,0,0.08)] overflow-hidden flex flex-col group hover:shadow-[0_12px_40px_-12px_rgba(0,0,0,0.12)] transition-shadow duration-300">
                <div className="relative w-full aspect-[4/5] bg-surface-container-high">
                  {file.type === "pdf" ? (
                    <iframe src={`${file.preview_url || file.url}#view=FitH&toolbar=0&navpanes=0`} className="w-full h-full border-0 pointer-events-none" title="PDF Preview"></iframe>
                  ) : (
                    <img className="w-full h-full object-cover" src={file.preview_url || file.url} alt="Quarantined file" />
                  )}
                  <div className="absolute top-md left-md">
                    <span className="bg-surface/90 backdrop-blur-sm text-error px-3 py-1 rounded-full font-label-sm text-label-sm uppercase flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">warning</span> Cuarentena
                    </span>
                  </div>
                </div>
                <div className="p-lg flex flex-col gap-md">
                  <div>
                    <h2 className="font-headline-sm text-headline-sm text-on-surface mb-unit">Archivo Sospechoso</h2>
                    <div className="flex items-center gap-xs text-on-surface-variant">
                      <span className="material-symbols-outlined text-[16px]">folder</span>
                      <span className="font-body-md text-body-md">Álbum: {file.album_id}</span>
                    </div>
                  </div>
                  <div className="flex gap-sm mt-auto">
                    <button 
                      onClick={() => handleDecision(file.id, "approve")}
                      className="flex-1 bg-tertiary text-on-tertiary font-label-md text-label-md py-3 rounded-full flex items-center justify-center gap-xs hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">check</span> Aprobar
                    </button>
                    <button 
                      onClick={() => handleDecision(file.id, "reject")}
                      className="flex-1 bg-error text-on-error font-label-md text-label-md py-3 rounded-full flex items-center justify-center gap-xs hover:opacity-90 transition-opacity cursor-pointer"
                    >
                      <span className="material-symbols-outlined text-[18px]">close</span> Rechazar
                    </button>
                  </div>
                  <Link href={`/quarantine?fileId=${file.id}`} className="w-full bg-secondary-fixed text-on-surface font-label-md text-label-md py-2 rounded-full flex items-center justify-center gap-xs hover:bg-secondary-fixed-dim transition-colors mt-2 cursor-pointer">
                    <span className="material-symbols-outlined text-[18px]">analytics</span> Ver Detalles
                  </Link>
                </div>
              </article>
            ))}
          </div>
        )}
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 w-full px-4 pb-6 bg-white/95 backdrop-blur-lg flex justify-around items-center max-w-md mx-auto h-16 md:hidden">
        <Link href="/">
          <button className="text-zinc-400 hover:bg-zinc-100 rounded-full active:scale-75 transition-all duration-300 ease-out p-2 flex flex-col items-center justify-center cursor-pointer">
            <span className="material-symbols-outlined text-[24px]">home</span>
            <span className="text-[10px]">Inicio</span>
          </button>
        </Link>
        <button className="text-zinc-900 scale-110 hover:bg-zinc-100 rounded-full active:scale-75 transition-all duration-300 ease-out p-2 flex flex-col items-center justify-center relative cursor-pointer">
          <span className="material-symbols-outlined text-[24px]" style={{fontVariationSettings: "'FILL' 1"}}>admin_panel_settings</span>
          <span className="text-[10px]">Admin</span>
          {files.length > 0 && <span className="absolute top-1 right-1 w-2 h-2 bg-[#E60023] rounded-full"></span>}
        </button>
      </nav>
    </div>
  );
}
