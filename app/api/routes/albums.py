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
