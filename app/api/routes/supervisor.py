from fastapi import APIRouter, HTTPException, Request
from app.models.schemas import Decision
from app.services.supabase_client import supabase, supabase_admin
from app.core.security import get_authenticated_user, get_user_id

router = APIRouter()


def log_decision(entity_type: str, entity_id: str, supervisor_id: str, action: str, reason: str | None):
    try:
        supabase_admin.table("decision_audit").insert({
            "entity_type": entity_type,
            "entity_id": entity_id,
            "supervisor_id": supervisor_id,
            "action": action,
            "reason": reason or ""
        }).execute()
    except Exception:
        pass

# ==========================================
# RF02: REVISIÓN DE ÁLBUMES (SUPERVISOR)
# ==========================================
@router.get("/albums")
async def get_pending_albums(request: Request, supervisor_id: str | None = None):
    auth_user = get_authenticated_user(request)
    auth_user_id = get_user_id(auth_user)
    user_profile = supabase_admin.table("profiles").select("role").eq("id", auth_user_id).execute()
    if not user_profile.data or user_profile.data[0]["role"] != "supervisor":
        raise HTTPException(status_code=403, detail="Access Denied: Requiere rol de Supervisor.")
        
    pending_albums = supabase_admin.table("albums").select("*").eq("status", "pending").execute()
    return {"pending_albums": pending_albums.data}

@router.patch("/albums/{album_id}")
async def resolve_album(request: Request, album_id: str, decision: Decision):
    auth_user = get_authenticated_user(request)
    auth_user_id = get_user_id(auth_user)
    user_profile = supabase_admin.table("profiles").select("role").eq("id", auth_user_id).execute()
    if not user_profile.data or user_profile.data[0]["role"] != "supervisor":
        raise HTTPException(status_code=403, detail="Access Denied: Requiere rol de Supervisor.")
        
    album_check = supabase_admin.table("albums").select("status").eq("id", album_id).execute()
    if not album_check.data:
        raise HTTPException(status_code=404, detail="Álbum no encontrado.")

    current_status = album_check.data[0].get("status")
    if current_status != "pending":
        raise HTTPException(status_code=409, detail="El álbum ya no está pendiente.")

    new_status = "approved" if decision.action == "approve" else "rejected"
    update_response = supabase_admin.table("albums").update({"status": new_status}).eq("id", album_id).execute()

    log_decision("album", album_id, auth_user_id, decision.action, decision.reason)
    
    return {"message": f"Álbum marcado como {new_status}.", "data": update_response.data}

# ==========================================
# RF04: FLUJO DE REVISIÓN MANUAL (SUPERVISOR)
# ==========================================
@router.get("/quarantine")
async def get_quarantined_files(request: Request, supervisor_id: str | None = None):
    """
    Obtiene la lista de archivos retenidos por los algoritmos de análisis.
    """
    auth_user = get_authenticated_user(request)
    auth_user_id = get_user_id(auth_user)
    user_profile = supabase_admin.table("profiles").select("role").eq("id", auth_user_id).execute()
    
    if not user_profile.data or user_profile.data[0]["role"] != "supervisor":
        raise HTTPException(status_code=403, detail="Access Denied: Requiere rol de Supervisor.")
        
    quarantine_data = supabase_admin.table("files").select("*").eq("status", "quarantined").execute()

    enriched = []
    for file in quarantine_data.data or []:
        preview_url = None
        try:
            signed = supabase_admin.storage.from_("secure-gallery-images").create_signed_url(file["storage_path"], 300)
            if hasattr(signed, "signed_url"):
                preview_url = signed.signed_url
            elif hasattr(signed, "data") and isinstance(signed.data, dict):
                preview_url = signed.data.get("signedUrl") or signed.data.get("signedURL")
            elif isinstance(signed, dict):
                preview_url = signed.get("signedURL") or signed.get("signedUrl")
        except Exception:
            preview_url = None

        enriched.append({
            **file,
            "preview_url": preview_url
        })

    return {"quarantined_files": enriched}

@router.patch("/quarantine/{file_id}")
async def resolve_quarantine(request: Request, file_id: str, decision: Decision):
    """
    El supervisor aprueba o rechaza el archivo.
    """
    auth_user = get_authenticated_user(request)
    auth_user_id = get_user_id(auth_user)
    user_profile = supabase_admin.table("profiles").select("role").eq("id", auth_user_id).execute()
    if not user_profile.data or user_profile.data[0]["role"] != "supervisor":
        raise HTTPException(status_code=403, detail="Access Denied: Requiere rol de Supervisor.")
    
    new_status = "clean" if decision.action == "approve" else "rejected"
    
    # 3. Lógica de movimiento en Storage (RF04)
    # Primero buscamos el archivo para saber su path actual
    file_record = supabase_admin.table("files").select("*").eq("id", file_id).execute()
    if file_record.data:
        f_data = file_record.data[0]
        old_path = f_data["storage_path"]
        
        if decision.action == "approve":
            # Mover de cuarentena a público
            new_path = old_path.replace("quarantine/", "uploads/")
            supabase_admin.storage.from_("secure-gallery-images").move(old_path, new_path)
            
            # Actualizar DB
            update_response = supabase_admin.table("files").update({
                "status": new_status,
                "storage_path": new_path
            }).eq("id", file_id).execute()
            log_decision("file", file_id, auth_user_id, decision.action, decision.reason)
            return {"message": f"Archivo aprobado y movido a público.", "data": update_response.data}
        else:
            # Eliminar del storage por rechazo
            supabase_admin.storage.from_("secure-gallery-images").remove([old_path])
            update_response = supabase_admin.table("files").update({"status": new_status}).eq("id", file_id).execute()
            log_decision("file", file_id, auth_user_id, decision.action, decision.reason)
            return {"message": f"Archivo rechazado y eliminado del servidor.", "data": update_response.data}
            
    return {"message": "Archivo no encontrado."}
