from fastapi import APIRouter, Request, HTTPException
import bleach
from app.models.schemas import AlbumCreate
from app.core.security import limiter
from app.services.supabase_client import supabase, supabase_admin
from app.core.security import get_authenticated_user, get_user_id

router = APIRouter()

# ==========================================
# RF02: GESTIÓN DE ÁLBUMES (Prevención XSS)
# ==========================================

@router.get("/my")
async def get_my_albums(request: Request, user_id: str | None = None):
    """
    Retorna los álbumes creados por un usuario específico.
    """
    auth_user = get_authenticated_user(request)
    auth_user_id = get_user_id(auth_user)
    response = supabase_admin.table("albums").select("*").eq("user_id", auth_user_id).execute()
    return response.data


@router.get("/approved-history")
async def get_approved_history(request: Request):
    """
    Retorna el historial de álbumes y archivos aprobados del usuario autenticado,
    enriquecidos con el email del supervisor que tomó la decisión desde decision_audit.
    """
    auth_user = get_authenticated_user(request)
    auth_user_id = get_user_id(auth_user)

    # Álbumes aprobados del usuario
    albums_resp = supabase_admin.table("albums") \
        .select("id, title, description, created_at, privacy") \
        .eq("user_id", auth_user_id) \
        .eq("status", "approved") \
        .order("created_at", desc=True) \
        .execute()

    approved_albums = []
    for album in albums_resp.data or []:
        # Buscar la entrada de auditoría más reciente para este álbum (acción approve)
        audit_resp = supabase_admin.table("decision_audit") \
            .select("supervisor_id, action, reason, created_at") \
            .eq("entity_id", album["id"]) \
            .eq("entity_type", "album") \
            .eq("action", "approve") \
            .order("created_at", desc=True) \
            .limit(1) \
            .execute()

        supervisor_email = None
        audit_reason = None
        approved_at = None

        if audit_resp.data:
            audit = audit_resp.data[0]
            audit_reason = audit.get("reason")
            approved_at = audit.get("created_at")
            supervisor_id = audit.get("supervisor_id")
            if supervisor_id:
                try:
                    user_resp = supabase_admin.auth.admin.get_user_by_id(supervisor_id)
                    if hasattr(user_resp, "user") and user_resp.user:
                        supervisor_email = user_resp.user.email
                    elif isinstance(user_resp, dict):
                        supervisor_email = (user_resp.get("user") or {}).get("email")
                except Exception:
                    supervisor_email = None

        # Archivos limpios del álbum
        files_resp = supabase_admin.table("files") \
            .select("id, file_type, created_at, status") \
            .eq("album_id", album["id"]) \
            .eq("user_id", auth_user_id) \
            .eq("status", "clean") \
            .execute()

        approved_albums.append({
            "id": album["id"],
            "title": album["title"],
            "description": album["description"],
            "privacy": album["privacy"],
            "created_at": album["created_at"],
            "approved_at": approved_at,
            "supervisor_email": supervisor_email,
            "audit_reason": audit_reason,
            "clean_files_count": len(files_resp.data or []),
        })

    return {"approved_albums": approved_albums}


@router.patch("/{album_id}/privacy")
async def update_album_privacy(request: Request, album_id: str, privacy: str):
    """
    Permite al propietario cambiar la privacidad del álbum.
    """
    if privacy not in ["public", "private"]:
        raise HTTPException(status_code=400, detail="Privacidad inválida.")

    auth_user = get_authenticated_user(request)
    auth_user_id = get_user_id(auth_user)

    album_check = supabase_admin.table("albums").select("id").eq("id", album_id).eq("user_id", auth_user_id).execute()
    if not album_check.data:
        raise HTTPException(status_code=404, detail="Álbum no encontrado.")

    update_response = supabase_admin.table("albums").update({"privacy": privacy}).eq("id", album_id).execute()
    if not update_response.data:
        raise HTTPException(status_code=403, detail="No tienes permisos para actualizar este álbum.")
    return {"message": "Privacidad actualizada.", "data": update_response.data}


@router.post("/request")
@limiter.limit("10/minute")
async def request_album(request: Request, album: AlbumCreate):
    """
    El usuario solicita crear un álbum. Pasa a estado 'pending'.
    """
    auth_user = get_authenticated_user(request)
    auth_user_id = get_user_id(auth_user)

    # Desinfección de Inputs
    clean_title = bleach.clean(album.title, tags=[], strip=True)
    clean_description = bleach.clean(album.description, tags=[], strip=True)

    # Insertar en base de datos
    response = supabase.table("albums").insert({
        "user_id": auth_user_id,
        "title": clean_title,
        "description": clean_description,
        "privacy": album.privacy,
        "status": "pending"
    }).execute()

    return {"message": "Álbum solicitado. Pendiente de revisión por un supervisor.", "data": response.data}


@router.get("/{album_id}")
async def get_album_detail(request: Request, album_id: str):
    """
    Obtiene detalles de un álbum por su ID (para uso interno del supervisor).
    """
    auth_user = get_authenticated_user(request)
    auth_user_id = get_user_id(auth_user)
    user_profile = supabase_admin.table("profiles").select("role").eq("id", auth_user_id).execute()
    if not user_profile.data or user_profile.data[0]["role"] != "supervisor":
        raise HTTPException(status_code=403, detail="Access Denied: Requiere rol de Supervisor.")

    response = supabase_admin.table("albums").select("*").eq("id", album_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Álbum no encontrado.")
    return response.data[0]

