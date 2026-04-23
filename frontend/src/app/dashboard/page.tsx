"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { supabase } from "@/lib/supabase";
import { Shield, Upload, Plus, LogOut, Loader2, AlertTriangle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { albumSchema, type AlbumFormData } from "@/schemas/album.schema";
import { albumService } from "@/services/album.service";
import { imageService } from "@/services/image.service";

export default function DashboardPage() {
  const [user, setUser] = useState<any>(null);
  const [albums, setAlbums] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadingTo, setUploadingTo] = useState<string | null>(null);
  const router = useRouter();

  const form = useForm<AlbumFormData>({
    resolver: zodResolver(albumSchema),
    defaultValues: { title: "", description: "" },
  });

  useEffect(() => {
    checkUser();
  }, []);

  async function checkUser() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUser(user);
    fetchMyAlbums(user.id);
  }

  async function fetchMyAlbums(userId: string) {
    try {
      const data = await albumService.getMyAlbums(userId);
      setAlbums(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function onSubmitAlbum(values: AlbumFormData) {
    try {
      await albumService.requestAlbum(user.id, values.title, values.description);
      fetchMyAlbums(user.id);
      form.reset();
      alert("✅ Álbum solicitado exitosamente. Esperando aprobación del supervisor.");
    } catch (e: any) {
      console.error(e);
      alert("❌ Error al solicitar el álbum: " + e.message);
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>, albumId: string) {
    if (!e.target.files || e.target.files.length === 0) return;
    const file = e.target.files[0];
    
    setUploadingTo(albumId);
    
    try {
      const data = await imageService.uploadSecureImage(file, user.id, albumId);
      
      if (data.status === "quarantined") {
        alert(`⚠️ ATENCIÓN: ${data.message}`);
      } else {
        alert("✅ Imagen subida y verificada correctamente.");
      }
    } catch (err: any) {
      console.error(err);
      alert(`Error: ${err.message || "Error de conexión"}`);
    } finally {
      setUploadingTo(null);
    }
  }

  if (loading) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-blue-500"/></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8 relative z-10">
        <header className="flex items-center justify-between bg-black/40 border border-white/10 p-6 rounded-2xl backdrop-blur-md">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="text-blue-500" /> Mi Centro de Operaciones
            </h1>
            <p className="text-gray-400 text-sm mt-1">{user?.email}</p>
          </div>
          <Button variant="ghost" onClick={() => supabase.auth.signOut().then(() => router.push("/"))} className="text-gray-400 hover:text-white hover:bg-white/5">
            <LogOut className="w-4 h-4 mr-2" /> Salir
          </Button>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Formulario Crear Álbum */}
          <div className="lg:col-span-1">
            <Card className="bg-black/40 border-white/10 backdrop-blur-md">
              <CardHeader>
                <CardTitle>Solicitar Álbum</CardTitle>
                <CardDescription className="text-gray-400">Todo álbum nuevo debe ser aprobado por un Supervisor (RF02).</CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={form.handleSubmit(onSubmitAlbum)} className="space-y-4">
                  <div className="space-y-2">
                    <Label className="text-gray-300">Título</Label>
                    <Input {...form.register("title")} className="bg-black/50 border-white/10 text-white" />
                    {form.formState.errors.title && <p className="text-xs text-red-400">{form.formState.errors.title.message}</p>}
                  </div>
                  <div className="space-y-2">
                    <Label className="text-gray-300">Descripción</Label>
                    <Input {...form.register("description")} className="bg-black/50 border-white/10 text-white" />
                    {form.formState.errors.description && <p className="text-xs text-red-400">{form.formState.errors.description.message}</p>}
                  </div>
                  <Button type="submit" className="w-full bg-blue-600 hover:bg-blue-500 text-white">
                    <Plus className="w-4 h-4 mr-2" /> Enviar Solicitud
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Lista de Álbumes */}
          <div className="lg:col-span-2 space-y-4">
            <h2 className="text-xl font-semibold">Mis Álbumes</h2>
            {albums.length === 0 ? (
              <div className="p-8 border border-dashed border-white/10 rounded-2xl text-center text-gray-500 bg-black/20">
                Aún no has solicitado ningún álbum.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {albums.map((album) => (
                  <Card key={album.id} className="bg-black/40 border-white/10 backdrop-blur-md flex flex-col">
                    <CardHeader className="pb-2">
                      <div className="flex justify-between items-start">
                        <CardTitle className="text-lg">{album.title}</CardTitle>
                        <span className={`text-xs px-2 py-1 rounded-full ${
                          album.status === 'approved' ? 'bg-green-500/20 text-green-400 border border-green-500/20' :
                          album.status === 'pending' ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/20' :
                          'bg-red-500/20 text-red-400 border border-red-500/20'
                        }`}>
                          {album.status.toUpperCase()}
                        </span>
                      </div>
                      <CardDescription className="text-gray-400">{album.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="mt-auto pt-4">
                      {album.status === 'approved' ? (
                        <div className="relative">
                          <input 
                            type="file" 
                            accept="image/png, image/jpeg" 
                            className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                            onChange={(e) => handleFileUpload(e, album.id)}
                            disabled={uploadingTo === album.id}
                          />
                          <Button variant="outline" className="w-full border-blue-500/30 text-blue-400 hover:bg-blue-500/10 pointer-events-none">
                            {uploadingTo === album.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4 mr-2" />}
                            {uploadingTo === album.id ? 'Analizando...' : 'Subir Imagen Segura'}
                          </Button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 text-sm text-yellow-500/80 bg-yellow-500/10 p-2 rounded border border-yellow-500/20">
                          <AlertTriangle className="w-4 h-4" />
                          Requiere aprobación para subir fotos.
                        </div>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
