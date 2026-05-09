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


def _require_supervisor(auth_user_id: str):
    """Raises 403 if the user is not a supervisor."""
    profile = supabase_admin.table("profiles").select("role").eq("id", auth_user_id).execute()
    if not profile.data or profile.data[0]["role"] != "supervisor":
        raise HTTPException(status_code=403, detail="Access Denied: Requiere rol de Supervisor.")


def _get_user_email(user_id: str) -> str | None:
    """Returns the email for a given auth user ID, or None on failure."""
    try:
        user_resp = supabase_admin.auth.admin.get_user_by_id(user_id)
        if hasattr(user_resp, "user") and user_resp.user:
            return user_resp.user.email
        if isinstance(user_resp, dict):
            return (user_resp.get("user") or {}).get("email")
    except Exception:
        pass
    return None


# ==========================================
# RF02: REVISIÓN DE ÁLBUMES (SUPERVISOR)
# ==========================================
@router.get("/albums")
async def get_pending_albums(request: Request, supervisor_id: str | None = None):
    auth_user = get_authenticated_user(request)
    auth_user_id = get_user_id(auth_user)
    _require_supervisor(auth_user_id)

    pending_albums = supabase_admin.table("albums").select("*").eq("status", "pending").execute()
    return {"pending_albums": pending_albums.data}


@router.patch("/albums/{album_id}")
async def resolve_album(request: Request, album_id: str, decision: Decision):
    auth_user = get_authenticated_user(request)
    auth_user_id = get_user_id(auth_user)
    _require_supervisor(auth_user_id)

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
# HISTORIAL DE DECISIONES (SUPERVISOR)
# ==========================================
@router.get("/decision-history")
async def get_all_decision_history(request: Request):
    """
    Retorna todos los álbumes y archivos aprobados y rechazados,
    enriquecidos con el email del supervisor y del propietario.
    Solo accesible por supervisores.
    """
    auth_user = get_authenticated_user(request)
    auth_user_id = get_user_id(auth_user)
    _require_supervisor(auth_user_id)

    # 1. ÁLBUMES
    albums_resp = supabase_admin.table("albums") \
        .select("id, user_id, title, description, created_at, privacy, status") \
        .in_("status", ["approved", "rejected"]) \
        .order("created_at", desc=True) \
        .execute()

    result_albums = []
    for album in albums_resp.data or []:
        audit_resp = supabase_admin.table("decision_audit") \
            .select("supervisor_id, action, reason, created_at") \
            .eq("entity_id", album["id"]) \
            .eq("entity_type", "album") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        supervisor_email = None
        audit_reason = None
        decision_at = None
        decision_action = None

        if audit_resp.data:
            audit = audit_resp.data[0]
            audit_reason = audit.get("reason")
            decision_at = audit.get("created_at")
            decision_action = audit.get("action")
            supervisor_id = audit.get("supervisor_id")
            if supervisor_id:
                supervisor_email = _get_user_email(supervisor_id)

        owner_email = _get_user_email(album["user_id"])
        files_resp = supabase_admin.table("files") \
            .select("id", count="exact") \
            .eq("album_id", album["id"]) \
            .execute()

        result_albums.append({
            "id": album["id"],
            "title": album["title"],
            "description": album["description"],
            "privacy": album["privacy"],
            "status": album["status"],
            "created_at": album["created_at"],
            "decision_at": decision_at,
            "decision_action": decision_action,
            "supervisor_email": supervisor_email,
            "owner_email": owner_email,
            "audit_reason": audit_reason,
            "files_count": files_resp.count or 0,
        })

    # 2. ARCHIVOS
    # Obtenemos primero los archivos desde decision_audit
    file_audits = supabase_admin.table("decision_audit") \
        .select("entity_id, supervisor_id, action, reason, created_at") \
        .eq("entity_type", "file") \
        .order("created_at", desc=True) \
        .execute()
        
    result_files = []
    seen_files = set()
    
    for audit in file_audits.data or []:
        file_id = audit["entity_id"]
        if file_id in seen_files:
            continue
        seen_files.add(file_id)
        
        file_resp = supabase_admin.table("files") \
            .select("id, album_id, user_id, storage_path, file_type, status, analysis_metadata, created_at") \
            .eq("id", file_id) \
            .execute()
            
        if file_resp.data:
            file_data = file_resp.data[0]
            
            # Obtener datos del álbum
            album_resp = supabase_admin.table("albums").select("title").eq("id", file_data["album_id"]).execute()
            album_title = album_resp.data[0]["title"] if album_resp.data else "Álbum desconocido"
            
            # URLs
            preview_url = None
            try:
                signed = supabase_admin.storage.from_("secure-gallery-images").create_signed_url(file_data["storage_path"], 300)
                if hasattr(signed, "signed_url"):
                    preview_url = signed.signed_url
                elif hasattr(signed, "data") and isinstance(signed.data, dict):
                    preview_url = signed.data.get("signedUrl") or signed.data.get("signedURL")
                elif isinstance(signed, dict):
                    preview_url = signed.get("signedURL") or signed.get("signedUrl")
            except Exception:
                pass
                
            supervisor_email = _get_user_email(audit.get("supervisor_id")) if audit.get("supervisor_id") else None
            owner_email = _get_user_email(file_data["user_id"])
            
            result_files.append({
                "id": file_id,
                "album_id": file_data["album_id"],
                "album_title": album_title,
                "file_type": file_data["file_type"],
                "status": file_data["status"],
                "preview_url": preview_url,
                "created_at": file_data["created_at"],
                "decision_at": audit["created_at"],
                "decision_action": audit["action"],
                "supervisor_email": supervisor_email,
                "owner_email": owner_email,
                "audit_reason": audit.get("reason"),
                "analysis_metadata": file_data.get("analysis_metadata")
            })

    return {"history_albums": result_albums, "history_files": result_files}


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
    _require_supervisor(auth_user_id)

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
    _require_supervisor(auth_user_id)

    new_status = "clean" if decision.action == "approve" else "rejected"

    file_record = supabase_admin.table("files").select("*").eq("id", file_id).execute()
    if file_record.data:
        f_data = file_record.data[0]
        old_path = f_data["storage_path"]

        if decision.action == "approve":
            new_path = old_path.replace("quarantine/", "uploads/")
            supabase_admin.storage.from_("secure-gallery-images").move(old_path, new_path)

            update_response = supabase_admin.table("files").update({
                "status": new_status,
                "storage_path": new_path
            }).eq("id", file_id).execute()
            log_decision("file", file_id, auth_user_id, decision.action, decision.reason)
            return {"message": "Archivo aprobado y movido a público.", "data": update_response.data}
        else:
            supabase_admin.storage.from_("secure-gallery-images").remove([old_path])
            update_response = supabase_admin.table("files").update({"status": new_status}).eq("id", file_id).execute()
            log_decision("file", file_id, auth_user_id, decision.action, decision.reason)
            return {"message": "Archivo rechazado y eliminado del servidor.", "data": update_response.data}

    return {"message": "Archivo no encontrado."}

