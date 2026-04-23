"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";
import { ShieldAlert, CheckCircle, XCircle, Loader2, RefreshCcw } from "lucide-react";
import { albumService } from "@/services/album.service";
import { imageService } from "@/services/image.service";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function SupervisorPage() {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [pendingAlbums, setPendingAlbums] = useState<any[]>([]);
  const [quarantineImages, setQuarantineImages] = useState<any[]>([]);
  const router = useRouter();

  useEffect(() => {
    checkSupervisor();
  }, []);

  async function checkSupervisor() {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    
    // Verificamos rol
    const { data } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (!data || data.role !== "supervisor") {
      alert("Acceso Denegado. Solo Supervisores.");
      router.push("/dashboard");
      return;
    }
    
    setUser(user);
    fetchAllData(user.id);
  }

  async function fetchAllData(supervisorId: string) {
    setLoading(true);
    try {
      const dataAlbums = await albumService.getPendingAlbums(supervisorId);
      setPendingAlbums(dataAlbums.pending_albums || []);

      const imagesWithUrl = await imageService.getQuarantinedImages(supervisorId);
      setQuarantineImages(imagesWithUrl);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }

  async function handleAlbumDecision(albumId: string, action: "approve" | "reject") {
    try {
      await albumService.decideAlbum(albumId, user.id, action);
      fetchAllData(user.id);
    } catch (e) {
      console.error(e);
    }
  }

  async function handleImageDecision(imageId: string, action: "approve" | "reject") {
    try {
      await imageService.decideImage(imageId, user.id, action);
      fetchAllData(user.id);
    } catch (e) {
      console.error(e);
    }
  }

  if (loading && !user) return <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center"><Loader2 className="w-8 h-8 animate-spin text-red-500"/></div>;

  return (
    <div className="min-h-screen bg-[#0a0a0a] text-white p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-8">
        <header className="flex items-center justify-between bg-red-950/20 border border-red-500/20 p-6 rounded-2xl backdrop-blur-md">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2 text-red-400">
              <ShieldAlert className="text-red-500" /> Panel de Control del Supervisor
            </h1>
            <p className="text-red-400/70 text-sm mt-1">Autorización estricta verificada para: {user?.email}</p>
          </div>
          <Button variant="outline" onClick={() => fetchAllData(user.id)} className="border-red-500/30 text-red-400 hover:bg-red-500/10">
            <RefreshCcw className="w-4 h-4 mr-2" /> Actualizar
          </Button>
        </header>

        <Tabs defaultValue="quarantine" className="w-full">
          <TabsList className="bg-black/50 border border-white/10 p-1 mb-6">
            <TabsTrigger value="quarantine" className="data-[state=active]:bg-red-500/20 data-[state=active]:text-red-400">
              Imágenes en Cuarentena ({quarantineImages.length})
            </TabsTrigger>
            <TabsTrigger value="albums" className="data-[state=active]:bg-blue-500/20 data-[state=active]:text-blue-400">
              Aprobación de Álbumes ({pendingAlbums.length})
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="quarantine">
            {quarantineImages.length === 0 ? (
               <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center text-gray-500 bg-black/20">
                No hay amenazas detectadas.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {quarantineImages.map((img) => (
                  <Card key={img.id} className="bg-black/40 border-red-500/30 backdrop-blur-md overflow-hidden">
                    <div className="aspect-video bg-black/80 relative">
                      {img.preview_url ? (
                        <img src={img.preview_url} alt="Quarantine preview" className="w-full h-full object-contain" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-xs text-gray-500">Sin vista previa</div>
                      )}
                      <div className="absolute top-2 right-2 bg-red-600 text-white text-xs px-2 py-1 rounded shadow">
                        Sospechoso
                      </div>
                    </div>
                    <CardHeader className="pb-2">
                      <CardTitle className="text-lg text-red-400">Anomalía LSB Detectada</CardTitle>
                      <CardDescription className="text-gray-400 font-mono text-xs">
                        Ratio: {img.analysis_metadata?.lsb_ratio_ones?.toFixed(4)} <br/>
                        (Rango de Peligro: 0.495 - 0.505)
                      </CardDescription>
                    </CardHeader>
                    <CardFooter className="flex gap-2 border-t border-white/5 pt-4">
                      <Button onClick={() => handleImageDecision(img.id, "reject")} className="flex-1 bg-red-600 hover:bg-red-700 text-white border-0">
                        <XCircle className="w-4 h-4 mr-2" /> Destruir
                      </Button>
                      <Button onClick={() => handleImageDecision(img.id, "approve")} variant="outline" className="flex-1 border-gray-600 text-gray-300 hover:bg-gray-800">
                        <CheckCircle className="w-4 h-4 mr-2" /> Falso Positivo
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="albums">
            {pendingAlbums.length === 0 ? (
               <div className="p-12 border border-dashed border-white/10 rounded-2xl text-center text-gray-500 bg-black/20">
                No hay solicitudes de álbumes pendientes.
              </div>
            ) : (
              <div className="space-y-4">
                {pendingAlbums.map((album) => (
                  <Card key={album.id} className="bg-black/40 border-blue-500/30 backdrop-blur-md">
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <div>
                          <CardTitle className="text-lg">{album.title}</CardTitle>
                          <CardDescription className="text-gray-400 mt-1">{album.description}</CardDescription>
                          <p className="text-xs text-gray-500 font-mono mt-2">Usuario: {album.user_id}</p>
                        </div>
                        <div className="flex gap-2">
                          <Button onClick={() => handleAlbumDecision(album.id, "reject")} variant="outline" size="icon" className="border-red-500/30 text-red-400 hover:bg-red-500/10">
                            <XCircle className="w-5 h-5" />
                          </Button>
                          <Button onClick={() => handleAlbumDecision(album.id, "approve")} variant="outline" size="icon" className="border-green-500/30 text-green-400 hover:bg-green-500/10">
                            <CheckCircle className="w-5 h-5" />
                          </Button>
                        </div>
                      </div>
                    </CardHeader>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}
