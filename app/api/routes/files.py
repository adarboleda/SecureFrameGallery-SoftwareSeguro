import io
try:
    import magic
except Exception:  # pragma: no cover - optional dependency on Windows
    magic = None
from fastapi import APIRouter, UploadFile, File, Form, HTTPException, Request
from PIL import Image
from app.services.supabase_client import supabase, supabase_admin
from app.services.file_analysis import analyze_image_steganography, analyze_pdf_security, strip_exif, verify_image_structure
from app.core.security import get_authenticated_user, get_user_id

router = APIRouter()

MAX_FILE_SIZE = 10 * 1024 * 1024 # Aumentado a 10MB para PDFs


def get_mime_type(contents: bytes) -> str:
    if magic is not None and hasattr(magic, "from_buffer"):
        return magic.from_buffer(contents, mime=True)

    if magic is not None and hasattr(magic, "Magic"):
        return magic.Magic(mime=True).from_buffer(contents)

    try:
        import filetype
    except Exception as exc:
        raise RuntimeError("python-magic no disponible o incompatible") from exc

    kind = filetype.guess(contents)
    if not kind:
        raise RuntimeError("No se pudo detectar el tipo de archivo")

    return kind.mime

@router.post("/upload")
async def upload_secure_file(request: Request, file: UploadFile = File(...), user_id: str = Form("demo-user-id"), album_id: str = Form("demo-album-id")):
    auth_user = get_authenticated_user(request)
    auth_user_id = get_user_id(auth_user)

    if user_id and user_id != auth_user_id:
        raise HTTPException(status_code=403, detail="User mismatch.")

    user_id = auth_user_id
    # VERIFICACIÓN PREVIA (RF03): Validar que el álbum esté aprobado
    album_check = supabase_admin.table("albums").select("status").eq("id", album_id).eq("user_id", user_id).execute()
    if not album_check.data:
        raise HTTPException(status_code=404, detail="Album not found or does not belong to user.")
    if album_check.data[0]["status"] != "approved":
        raise HTTPException(status_code=403, detail="Album must be approved by a supervisor before uploading files.")

    if not file.filename:
        raise HTTPException(status_code=400, detail="Nombre de archivo inválido.")

    existing_paths = [
        f"uploads/{album_id}/{file.filename}",
        f"quarantine/{album_id}/{file.filename}",
    ]
    existing = (
        supabase_admin.table("files")
        .select("id")
        .eq("album_id", album_id)
        .in_("storage_path", existing_paths)
        .execute()
    )
    if existing.data:
        raise HTTPException(status_code=409, detail="Ya existe un archivo con ese nombre en el álbum.")

    contents = await file.read()
    
    # CONTROL DE SEGURIDAD 1: Tamaño del archivo
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 10MB limit.")
        
    # CONTROL DE SEGURIDAD 2: File Magic Numbers
    try:
        mime_type = get_mime_type(contents)
    except RuntimeError:
        raise HTTPException(status_code=400, detail="Formato no permitido. Solo JPEG, PNG o PDF.")
    if mime_type not in ["image/jpeg", "image/png", "application/pdf"]:
        raise HTTPException(status_code=400, detail="Formato no permitido. Solo JPEG, PNG o PDF.")
        
    try:
        if mime_type in ["image/jpeg", "image/png"]:
            file_type = "image"
            
            # CONTROL DE SEGURIDAD 3: EXIF Stripping & PIL Parsing
            # PIL acts as a secondary validation.
            try:
                original_img = Image.open(io.BytesIO(contents))
                original_img.verify() # Validate structure
                original_img = Image.open(io.BytesIO(contents)) # Re-open after verify
            except Exception as e:
                raise HTTPException(status_code=400, detail=f"Invalid image format: {str(e)}")

            structure_check = verify_image_structure(contents, mime_type)
            
            clean_img = strip_exif(original_img)
            
            # CONTROL DE SEGURIDAD 4: Análisis Avanzado (LSB, Chi-Square, DCT)
            analysis_result = analyze_image_steganography(clean_img)
            
            # Si falló la validación estricta de estructura, lo agregamos a los detalles
            # pero NO lo marcamos como sospechoso para evitar que bloquee descargas de internet legítimas.
            # PIL ya limpió y convirtió la imagen, lo que neutraliza bytes basura al final.
            if not structure_check.get("ok", False):
                analysis_result["details"]["structure_anomaly"] = structure_check.get("details", "unknown")
            
            output_buffer = io.BytesIO()
            clean_img.save(output_buffer, format="PNG")
            clean_bytes = output_buffer.getvalue()
            content_type = "image/png"
        else:
            file_type = "pdf"
            # CONTROL DE SEGURIDAD PDF: Buscar scripts maliciosos o adjuntos ocultos
            analysis_result = analyze_pdf_security(contents)
            clean_bytes = contents # Para PDFs no modificamos el archivo original si está limpio (solo lo pasamos a cuarentena si es sospechoso)
            content_type = "application/pdf"
            
        status = "quarantined" if analysis_result.get("is_suspicious", False) else "clean"
        folder = "quarantine" if status == "quarantined" else "uploads"
        
        file_path = f"{folder}/{album_id}/{file.filename}"
        
        # Subir a bucket
        upload_result = supabase_admin.storage.from_("secure-gallery-images").upload(
            file_path,
            clean_bytes,
            file_options={"content-type": content_type, "upsert": "true"}
        )
        if hasattr(upload_result, "error") and upload_result.error:
            raise RuntimeError(f"Storage upload failed: {upload_result.error}")
        
        # Guardar en base de datos (tabla 'files')
        supabase_admin.table("files").insert({
            "album_id": album_id,
            "user_id": user_id,
            "storage_path": file_path,
            "file_type": file_type,
            "status": status,
            "analysis_metadata": analysis_result
        }).execute()
        
        if status == "quarantined":
            return {"message": "File quarantined due to anomalous structure or entropy.", "status": status, "metadata": analysis_result}
        else:
            return {"message": "File uploaded and verified successfully.", "status": status}
            
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")


@router.delete("/files/{file_id}")
async def delete_file(file_id: str, request: Request):
    """
    Elimina un archivo del álbum del usuario autenticado.
    Verifica que el archivo pertenezca al usuario antes de borrarlo.
    """
    auth_user = get_authenticated_user(request)
    auth_user_id = get_user_id(auth_user)

    # Obtener el archivo y verificar propiedad
    file_data = supabase_admin.table("files").select("id, user_id, storage_path").eq("id", file_id).execute()
    if not file_data.data:
        raise HTTPException(status_code=404, detail="Archivo no encontrado.")

    file_record = file_data.data[0]
    if file_record["user_id"] != auth_user_id:
        raise HTTPException(status_code=403, detail="No tienes permiso para eliminar este archivo.")

    # Eliminar del storage de Supabase
    try:
        supabase_admin.storage.from_("secure-gallery-images").remove([file_record["storage_path"]])
    except Exception:
        pass  # Si ya no existe en storage, continuar con el borrado de la BD

    # Eliminar el registro de la base de datos
    supabase_admin.table("files").delete().eq("id", file_id).execute()

    return {"message": "Archivo eliminado correctamente.", "file_id": file_id}
