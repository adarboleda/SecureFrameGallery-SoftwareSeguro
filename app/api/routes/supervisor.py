from fastapi import APIRouter, HTTPException
from app.models.schemas import Decision
from app.services.supabase_client import supabase

router = APIRouter()

# ==========================================
# RF02: REVISIÓN DE ÁLBUMES (SUPERVISOR)
# ==========================================
@router.get("/albums")
async def get_pending_albums(supervisor_id: str):
    user_profile = supabase.table("profiles").select("role").eq("id", supervisor_id).execute()
    if not user_profile.data or user_profile.data[0]["role"] != "supervisor":
        raise HTTPException(status_code=403, detail="Access Denied: Requiere rol de Supervisor.")
        
    pending_albums = supabase.table("albums").select("*").eq("status", "pending").execute()
    return {"pending_albums": pending_albums.data}

@router.patch("/albums/{album_id}")
async def resolve_album(album_id: str, decision: Decision):
    user_profile = supabase.table("profiles").select("role").eq("id", decision.supervisor_id).execute()
    if not user_profile.data or user_profile.data[0]["role"] != "supervisor":
        raise HTTPException(status_code=403, detail="Access Denied: Requiere rol de Supervisor.")
        
    new_status = "approved" if decision.action == "approve" else "rejected"
    update_response = supabase.table("albums").update({"status": new_status}).eq("id", album_id).execute()
    
    return {"message": f"Álbum marcado como {new_status}.", "data": update_response.data}

# ==========================================
# RF04: FLUJO DE REVISIÓN MANUAL (SUPERVISOR)
# ==========================================
@router.get("/quarantine")
async def get_quarantined_files(supervisor_id: str):
    """
    Obtiene la lista de archivos retenidos por los algoritmos de análisis.
    """
    user_profile = supabase.table("profiles").select("role").eq("id", supervisor_id).execute()
    
    if not user_profile.data or user_profile.data[0]["role"] != "supervisor":
        raise HTTPException(status_code=403, detail="Access Denied: Requiere rol de Supervisor.")
        
    quarantine_data = supabase.table("files").select("*").eq("status", "quarantined").execute()
    
    return {"quarantined_files": quarantine_data.data}

@router.patch("/quarantine/{file_id}")
async def resolve_quarantine(file_id: str, decision: Decision):
    """
    El supervisor aprueba o rechaza el archivo.
    """
    user_profile = supabase.table("profiles").select("role").eq("id", decision.supervisor_id).execute()
    if not user_profile.data or user_profile.data[0]["role"] != "supervisor":
        raise HTTPException(status_code=403, detail="Access Denied: Requiere rol de Supervisor.")
    
    new_status = "clean" if decision.action == "approve" else "rejected"
    
    # 3. Lógica de movimiento en Storage (RF04)
    # Primero buscamos el archivo para saber su path actual
    file_record = supabase.table("files").select("*").eq("id", file_id).execute()
    if file_record.data:
        f_data = file_record.data[0]
        old_path = f_data["storage_path"]
        
        if decision.action == "approve":
            # Mover de cuarentena a público
            new_path = old_path.replace("quarantine/", "uploads/")
            supabase.storage.from_("secure-gallery-images").move(old_path, new_path)
            
            # Actualizar DB
            update_response = supabase.table("files").update({
                "status": new_status,
                "storage_path": new_path
            }).eq("id", file_id).execute()
            return {"message": f"Archivo aprobado y movido a público.", "data": update_response.data}
        else:
            # Eliminar del storage por rechazo
            supabase.storage.from_("secure-gallery-images").remove([old_path])
            update_response = supabase.table("files").update({"status": new_status}).eq("id", file_id).execute()
            return {"message": f"Archivo rechazado y eliminado del servidor.", "data": update_response.data}
            
    return {"message": "Archivo no encontrado."}
