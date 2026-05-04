import { apiFetch } from "./api";
import { supabase } from "@/lib/supabase";

export const albumService = {
  // Public
  async getPublicAlbums() {
    return await apiFetch("/api/public/albums");
  },

  // User
  async getMyAlbums(userId: string) {
    return await apiFetch(`/api/albums/my?user_id=${userId}`);
  },

  async requestAlbum(userId: string, title: string, description: string, privacy: string = "public") {
    return await apiFetch("/api/albums/request", {
      method: "POST",
      body: JSON.stringify({
        user_id: userId,
        title,
        description,
        privacy
      })
    });
  },

  // Supervisor
  async getPendingAlbums(supervisorId: string) {
    return await apiFetch(`/api/supervisor/albums?supervisor_id=${supervisorId}`);
  },

  async decideAlbum(albumId: string, supervisorId: string, action: "approve" | "reject", reason?: string) {
    return await apiFetch(`/api/supervisor/albums/${albumId}`, {
      method: "PATCH",
      body: JSON.stringify({ supervisor_id: supervisorId, action, reason })
    });
  }
};
