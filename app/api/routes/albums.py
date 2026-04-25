from fastapi import APIRouter, Request
import bleach
from app.models.schemas import AlbumCreate
from app.core.security import limiter
from app.services.supabase_client import supabase

router = APIRouter()

# ==========================================
# RF02: GESTIÓN DE ÁLBUMES (Prevención XSS)
# ==========================================

@router.get("/my")
async def get_my_albums(user_id: str):
    """
    Retorna los álbumes creados por un usuario específico.
    """
    response = supabase.table("albums").select("*").eq("user_id", user_id).execute()
    return response.data
@router.post("/request")
@limiter.limit("10/minute")
async def request_album(request: Request, album: AlbumCreate):
    """
    El usuario solicita crear un álbum. Pasa a estado 'pending'.
    """
    # Desinfección de Inputs
    clean_title = bleach.clean(album.title, tags=[], strip=True)
    clean_description = bleach.clean(album.description, tags=[], strip=True)
    
    # Insertar en base de datos
    response = supabase.table("albums").insert({
        "user_id": album.user_id,
        "title": clean_title,
        "description": clean_description,
        "status": "pending"
    }).execute()
    
    return {"message": "Álbum solicitado. Pendiente de revisión por un supervisor.", "data": response.data}
