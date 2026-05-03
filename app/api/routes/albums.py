from fastapi import APIRouter, Request
import bleach
from app.models.schemas import AlbumCreate
from app.core.security import limiter
from app.services.supabase_client import supabase
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
    response = supabase.table("albums").select("*").eq("user_id", auth_user_id).execute()
    return response.data
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
async def get_album_detail(album_id: str):
    """
    Obtiene detalles de un álbum por su ID (para uso interno del supervisor).
    """
    from fastapi import HTTPException
    response = supabase.table("albums").select("*").eq("id", album_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Álbum no encontrado.")
    return response.data[0]
