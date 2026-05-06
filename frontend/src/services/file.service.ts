import { apiFetch } from "./api";
import { supabase } from "@/lib/supabase";

export const fileService = {
  // Public
  async getPublicFiles(albumId: string) {
    return await apiFetch(`/api/public/albums/${albumId}/files`);
  },

  // User
  async uploadSecureFile(file: File, userId: string, albumId: string) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("user_id", userId);
    formData.append("album_id", albumId);
    
    return await apiFetch(`/api/upload`, {
      method: "POST",
      body: formData
    });
  },

  // Supervisor
  async getQuarantinedFiles(supervisorId: string) {
    const data = await apiFetch(`/api/supervisor/quarantine?supervisor_id=${supervisorId}`);
    return data.quarantined_files || [];
  },

  async decideFile(fileId: string, supervisorId: string, action: "approve" | "reject", reason?: string) {
    return await apiFetch(`/api/supervisor/quarantine/${fileId}`, {
      method: "PATCH",
      body: JSON.stringify({ supervisor_id: supervisorId, action, reason })
    });
  }
};
