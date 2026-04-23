import io
import magic
from fastapi import APIRouter, UploadFile, File, HTTPException
from PIL import Image
from app.services.supabase_client import supabase
from app.services.image_analysis import analyze_lsb_steganography, strip_exif

router = APIRouter()

MAX_FILE_SIZE = 5 * 1024 * 1024 

@router.post("/upload")
async def upload_secure_image(file: UploadFile = File(...), user_id: str = "demo-user-id", album_id: str = "demo-album-id"):
    # VERIFICACIÓN PREVIA (RF03): Validar que el álbum esté aprobado
    album_check = supabase.table("albums").select("status").eq("id", album_id).eq("user_id", user_id).execute()
    if not album_check.data:
        raise HTTPException(status_code=404, detail="Album not found or does not belong to user.")
    if album_check.data[0]["status"] != "approved":
        raise HTTPException(status_code=403, detail="Album must be approved by a supervisor before uploading images.")

    contents = await file.read()
    
    # CONTROL DE SEGURIDAD 1: Tamaño del archivo
    if len(contents) > MAX_FILE_SIZE:
        raise HTTPException(status_code=400, detail="File exceeds 5MB limit.")
        
    # CONTROL DE SEGURIDAD 2: File Magic Numbers
    mime_type = magic.from_buffer(contents, mime=True)
    if mime_type not in ["image/jpeg", "image/png"]:
        raise HTTPException(status_code=400, detail="Invalid file signature. Only JPEG/PNG allowed.")
        
    try:
        original_img = Image.open(io.BytesIO(contents))
        
        # CONTROL DE SEGURIDAD 3: EXIF Stripping
        clean_img = strip_exif(original_img)
        
        # CONTROL DE SEGURIDAD 4: Análisis LSB
        analysis_result = analyze_lsb_steganography(clean_img)
        
        output_buffer = io.BytesIO()
        clean_img.save(output_buffer, format="PNG")
        clean_bytes = output_buffer.getvalue()
        
        if analysis_result["is_suspicious"]:
            status = "quarantined"
            quarantine_path = f"quarantine/{album_id}/{file.filename}"
            
            # Guardamos en bucket de cuarentena para revisión (RF04)
            supabase.storage.from_("secure-gallery-images").upload(quarantine_path, clean_bytes)
            
            supabase.table("images").insert({
                "album_id": album_id,
                "user_id": user_id,
                "storage_path": quarantine_path,
                "status": status,
                "analysis_metadata": analysis_result
            }).execute()
            
            return {"message": "Image quarantined due to anomalous LSB entropy.", "status": status, "metadata": analysis_result}
            
        else:
            status = "clean"
            file_path = f"uploads/{album_id}/{file.filename}"
            supabase.storage.from_("secure-gallery-images").upload(file_path, clean_bytes)
            
            supabase.table("images").insert({
                "album_id": album_id,
                "user_id": user_id,
                "storage_path": file_path,
                "status": status,
                "analysis_metadata": analysis_result
            }).execute()
            
            return {"message": "Image uploaded and verified successfully.", "status": status}
            
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error processing image: {str(e)}")
