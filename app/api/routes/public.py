from fastapi import APIRouter, Response
from app.services.supabase_client import supabase

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
    
    albums_data = supabase.table("albums").select("id, title, description, created_at").eq("status", "approved").eq("privacy", "public").execute()
    # Asumimos que queremos mostrar álbumes que son public y approved
    # Wait, la tabla albums tiene "privacy" = 'public' | 'private'. Vamos a mostrar solo los públicos aprobados.
    
    return {"albums": albums_data.data}

@router.get("/albums/{album_id}/files")
async def get_public_files(album_id: str, response: Response):
    """
    Devuelve las URLs de los archivos "limpios" de un álbum aprobado.
    """
    add_security_headers(response)
    
    # Verificar que el álbum sea público y esté aprobado
    album_check = supabase.table("albums").select("*").eq("id", album_id).eq("status", "approved").eq("privacy", "public").execute()
    if not album_check.data:
        # Devolvemos array vacío para no filtrar información sobre si existe un álbum privado
        return {"files": []}
        
    # Buscar los archivos que pasaron el análisis (status = clean)
    files_data = supabase.table("files").select("id, storage_path, file_type, created_at").eq("album_id", album_id).eq("status", "clean").execute()
    
    # Construir las URLs públicas usando Supabase Storage
    result_files = []
    for file in files_data.data:
        public_url = supabase.storage.from_("secure-gallery-images").get_public_url(file["storage_path"])
        result_files.append({
            "id": file["id"],
            "url": public_url,
            "type": file["file_type"],
            "created_at": file["created_at"]
        })
        
    return {"files": result_files}
