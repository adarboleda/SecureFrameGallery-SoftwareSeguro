import io
try:
    import magic
except Exception:  # pragma: no cover - optional dependency on Windows
    magic = None
from fastapi import APIRouter, UploadFile, File, Form, HTTPException
from PIL import Image
from app.services.supabase_client import supabase
from app.services.file_analysis import analyze_image_steganography, analyze_pdf_security, strip_exif, verify_image_structure

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
async def upload_secure_file(file: UploadFile = File(...), user_id: str = Form("demo-user-id"), album_id: str = Form("demo-album-id")):
    # VERIFICACIÓN PREVIA (RF03): Validar que el álbum esté aprobado
    album_check = supabase.table("albums").select("status").eq("id", album_id).eq("user_id", user_id).execute()
    if not album_check.data:
        raise HTTPException(status_code=404, detail="Album not found or does not belong to user.")
    if album_check.data[0]["status"] != "approved":
        raise HTTPException(status_code=403, detail="Album must be approved by a supervisor before uploading files.")

    contents = await file.read()
    
    # CONTROL DE SEGURIDAD 1: Tamaño del archivo
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 10MB limit.")
        
    # CONTROL DE SEGURIDAD 2: File Magic Numbers
    mime_type = get_mime_type(contents)
    if mime_type not in ["image/jpeg", "image/png", "application/pdf"]:
        raise HTTPException(status_code=400, detail="Invalid file signature. Only JPEG, PNG or PDF allowed.")
        
    try:
        if mime_type in ["image/jpeg", "image/png"]:
            file_type = "image"

            structure_check = verify_image_structure(contents, mime_type)
            if not structure_check.get("ok", False):
                raise HTTPException(
                    status_code=400,
                    detail=f"Invalid image structure: {structure_check.get('details', 'unknown')}"
                )

            original_img = Image.open(io.BytesIO(contents))
            
            # CONTROL DE SEGURIDAD 3: EXIF Stripping
            clean_img = strip_exif(original_img)
            
            # CONTROL DE SEGURIDAD 4: Análisis Avanzado (LSB, Chi-Square, DCT)
            analysis_result = analyze_image_steganography(clean_img)
            
            output_buffer = io.BytesIO()
            clean_img.save(output_buffer, format="PNG")
            clean_bytes = output_buffer.getvalue()
        else:
            file_type = "pdf"
            # CONTROL DE SEGURIDAD PDF: Buscar scripts maliciosos o adjuntos ocultos
            analysis_result = analyze_pdf_security(contents)
            clean_bytes = contents # Para PDFs no modificamos el archivo original si está limpio (solo lo pasamos a cuarentena si es sospechoso)
            
        status = "quarantined" if analysis_result.get("is_suspicious", False) else "clean"
        folder = "quarantine" if status == "quarantined" else "uploads"
        
        file_path = f"{folder}/{album_id}/{file.filename}"
        
        # Subir a bucket
        supabase.storage.from_("secure-gallery-images").upload(file_path, clean_bytes)
        
        # Guardar en base de datos (tabla 'files')
        supabase.table("files").insert({
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
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing file: {str(e)}")
