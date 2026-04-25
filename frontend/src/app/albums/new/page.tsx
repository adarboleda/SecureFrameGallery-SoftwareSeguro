"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { albumService } from "@/services/album.service";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function NewAlbum() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const router = useRouter();

  const [userId, setUserId] = useState<string | null>(null);

  useEffect(() => {
    async function loadUser() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        router.push("/login");
        return;
      }
      setUserId(user.id);
    }
    loadUser();
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setIsSubmitting(true);
    try {
      await albumService.requestAlbum(userId, title, description);
      router.push("/dashboard");
    } catch (err) {
      console.error("Error al crear álbum", err);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="bg-background min-h-screen flex items-center justify-center p-container-margin antialiased">
      {/* Suppressed TopAppBar and BottomNavBar as this is a transactional form screen */}
      <main className="w-full max-w-[480px]">
        <div className="bg-surface-container-lowest rounded-xl shadow-[0_8px_32px_-12px_rgba(0,0,0,0.08)] p-xl w-full flex flex-col gap-lg relative">
          
          {/* Close Button (Transactional Context) */}
          <Link href="/dashboard" className="absolute top-6 right-6 w-10 h-10 flex items-center justify-center rounded-full bg-secondary-fixed/50 hover:bg-secondary-fixed text-on-surface transition-colors duration-200 cursor-pointer">
            <span className="material-symbols-outlined" style={{fontVariationSettings: "'FILL' 0"}}>close</span>
          </Link>
          
          {/* Header */}
          <div className="flex flex-col gap-sm pt-sm">
            <h1 className="font-headline-md text-headline-md text-on-surface">Nuevo Álbum</h1>
            <p className="font-body-md text-body-md text-secondary">Crea una nueva colección para organizar tus archivos multimedia y previsualizar tus PDFs de forma segura.</p>
          </div>
          
          {/* Form */}
          <form className="flex flex-col gap-lg mt-sm" onSubmit={handleSubmit}>
            {/* Title Input */}
            <div className="flex flex-col gap-sm">
              <label className="font-label-md text-label-md text-on-surface ml-unit" htmlFor="album-title">Título</label>
              <input 
                className="w-full bg-secondary-fixed border-none rounded-full px-lg py-4 font-body-md text-body-md text-on-surface placeholder:text-on-secondary-container focus:ring-2 focus:ring-primary-container transition-all duration-200 outline-none" 
                id="album-title" 
                placeholder="Ej. Planos de Arquitectura 2024" 
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>
            
            {/* Description Input */}
            <div className="flex flex-col gap-sm">
              <label className="font-label-md text-label-md text-on-surface ml-unit" htmlFor="album-description">
                Descripción <span className="text-secondary font-normal">(Opcional)</span>
              </label>
              <textarea 
                className="w-full bg-secondary-fixed border-none rounded-DEFAULT px-lg py-4 font-body-md text-body-md text-on-surface placeholder:text-on-secondary-container focus:ring-2 focus:ring-primary-container transition-all duration-200 outline-none resize-none" 
                id="album-description" 
                placeholder="¿De qué trata este álbum?" 
                rows={4}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              ></textarea>
            </div>
            
            {/* Actions */}
            <div className="pt-sm flex flex-col gap-md">
              <button 
                disabled={isSubmitting}
                className="w-full bg-primary-container hover:bg-primary text-on-primary-container font-headline-sm text-headline-sm rounded-full py-4 transition-all duration-200 active:scale-[0.98] shadow-sm cursor-pointer disabled:opacity-50 flex justify-center items-center gap-2" 
                type="submit"
              >
                {isSubmitting ? <span className="material-symbols-outlined animate-spin">refresh</span> : null}
                {isSubmitting ? "Enviando..." : "Solicitar Álbum"}
              </button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
