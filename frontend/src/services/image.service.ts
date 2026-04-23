import { apiFetch } from "./api";
import { supabase } from "@/lib/supabase";

export const imageService = {
  // Public
  async getPublicImages(albumId: string) {
    return await apiFetch(`/api/public/albums/${albumId}/images`);
  },

  // User
  async uploadSecureImage(file: File, userId: string, albumId: string) {
    const formData = new FormData();
    formData.append("file", file);
    return await apiFetch(`/api/upload?user_id=${userId}&album_id=${albumId}`, {
      method: "POST",
      body: formData
    });
  },

  // Supervisor
  async getQuarantinedImages(supervisorId: string) {
    const data = await apiFetch(`/api/supervisor/quarantine?supervisor_id=${supervisorId}`);
    
    // Obtener URLs temporales seguras (Signed URLs) para la previsualización del supervisor
    const imagesWithUrl = await Promise.all((data.quarantined_images || []).map(async (img: any) => {
      const { data: urlData } = await supabase.storage.from("secure-gallery-images").createSignedUrl(img.storage_path, 60);
      return { ...img, preview_url: urlData?.signedUrl };
    }));
    
    return imagesWithUrl;
  },

  async decideImage(imageId: string, supervisorId: string, action: "approve" | "reject") {
    return await apiFetch(`/api/supervisor/quarantine/${imageId}`, {
      method: "PATCH",
      body: JSON.stringify({ supervisor_id: supervisorId, action })
    });
  }
};
