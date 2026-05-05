from fastapi import APIRouter, Response, Request
from app.services.supabase_client import supabase, supabase_admin
from app.core.security import get_authenticated_user, get_user_id

router = APIRouter()

def add_security_headers(response: Response):
    """
    Añade las cabeceras de seguridad exigidas en el RF05.
    """
    # Previene que el navegador trate de "adivinar" el tipo de contenido, mitigando ataques de MIME Sniffing.
    response.headers["X-Content-Type-Options"] = "nosniff"
    
    # Política de seguridad de contenido estricta. Solo permite cargar imágenes del propio dominio y del dominio de Supabase.
    # Bloquea la ejecución de scripts (previene XSS).
    response.headers["Content-Security-Policy"] = "default-src 'self'; img-src 'self' https://*.supabase.co; script-src 'none'; object-src 'none';"


def extract_signed_url(signed_response) -> str:
    if hasattr(signed_response, "signed_url"):
        return signed_response.signed_url or ""

    if hasattr(signed_response, "data"):
        data = signed_response.data or {}
        if isinstance(data, dict):
            return data.get("signedUrl") or data.get("signedURL") or ""

    if isinstance(signed_response, dict):
        if "data" in signed_response and isinstance(signed_response["data"], dict):
            data = signed_response["data"]
            return data.get("signedUrl") or data.get("signedURL") or ""
        return signed_response.get("signedURL") or signed_response.get("signedUrl") or ""

    return ""

# ==========================================
# RF05: VISUALIZACIÓN PÚBLICA SEGURA
# ==========================================
@router.get("/albums")
async def get_public_albums(response: Response):
    """
    Devuelve la lista de álbumes que han sido aprobados por el supervisor.
    Cualquier usuario (no autenticado) puede verlos.
    """
    add_security_headers(response)
    
    albums_data = supabase_admin.table("albums").select("id, user_id, title, description, created_at").eq("status", "approved").eq("privacy", "public").execute()

    result_albums = []
    for album in albums_data.data:
        owner_name = ""
        try:
            user_resp = supabase_admin.auth.admin.get_user_by_id(album["user_id"])
            if hasattr(user_resp, "user") and user_resp.user:
                meta = user_resp.user.user_metadata or {}
                owner_name = meta.get("username") or (user_resp.user.email or "")
            elif isinstance(user_resp, dict):
                user_data = user_resp.get("user") or {}
                meta = user_data.get("user_metadata") or {}
                owner_name = meta.get("username") or user_data.get("email") or ""
        except Exception:
            owner_name = ""

        if owner_name and "@" in owner_name:
            owner_name = owner_name.split("@")[0]

        result_albums.append({
            "id": album["id"],
            "title": album["title"],
            "description": album["description"],
            "created_at": album["created_at"],
            "owner_name": owner_name
        })

    return {"albums": result_albums}

@router.get("/albums/{album_id}/files")
async def get_public_files(album_id: str, response: Response):
    """
    Devuelve las URLs de los archivos "limpios" de un álbum aprobado.
    """
    add_security_headers(response)
    
    # Verificar que el álbum sea público y esté aprobado
    album_check = supabase_admin.table("albums").select("id").eq("id", album_id).eq("status", "approved").eq("privacy", "public").execute()
    if not album_check.data:
        # Devolvemos array vacío para no filtrar información sobre si existe un álbum privado
        return {"files": []}
        
    # Buscar los archivos que pasaron el análisis (status = clean)
    files_data = supabase_admin.table("files").select("id, storage_path, file_type, created_at").eq("album_id", album_id).eq("status", "clean").execute()
    
    # Construir las URLs públicas usando Supabase Storage
    result_files = []
    for file in files_data.data:
        public_url = supabase.storage.from_("secure-gallery-images").get_public_url(file["storage_path"])
        signed_url = ""
        try:
            signed_response = supabase_admin.storage.from_("secure-gallery-images").create_signed_url(file["storage_path"], 300)
            signed_url = extract_signed_url(signed_response)
        except Exception:
            signed_url = ""
        result_files.append({
            "id": file["id"],
            "url": signed_url or public_url,
            "type": file["file_type"],
            "created_at": file["created_at"]
        })
        
    return {"files": result_files}


@router.get("/albums/{album_id}/my-files")
async def get_my_album_files(request: Request, album_id: str, user_id: str | None, response: Response):
    """
    Retorna TODOS los archivos de un álbum para su propietario (cualquier estado).
    """
    from fastapi import HTTPException

    auth_user = get_authenticated_user(request)
    auth_user_id = get_user_id(auth_user)

    if user_id and user_id != auth_user_id:
        raise HTTPException(status_code=403, detail="User mismatch.")

    album_check = supabase.table("albums").select("id").eq("id", album_id).eq("user_id", auth_user_id).execute()
    if not album_check.data:
        raise HTTPException(status_code=403, detail="No tienes acceso a este álbum.")

    files_data = supabase.table("files").select("id, storage_path, file_type, status, created_at").eq("album_id", album_id).execute()

    result_files = []
    for file in files_data.data:
        public_url = supabase.storage.from_("secure-gallery-images").get_public_url(file["storage_path"])

        # Try signed URL first (works for private buckets and quarantined files)
        try:
            signed_response = supabase.storage.from_("secure-gallery-images").create_signed_url(file["storage_path"], 300)
            signed_url = extract_signed_url(signed_response)
            url = signed_url if signed_url else public_url
        except Exception:
            url = public_url
            
        result_files.append({
            "id": file["id"],
            "url": url,
            "type": file["file_type"],
            "status": file["status"]
        })

    return {"files": result_files}
