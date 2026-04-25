import os
import uuid
from supabase import create_client, Client
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

def setup_test_environment():
    print("Iniciando configuración del entorno de prueba...\n")
    
    try:
        # 1. Crear un Usuario Normal
        print("1. Creando usuario normal de prueba...")
        user_email = f"user_{uuid.uuid4().hex[:6]}@securegallery.com"
        
        user_res = supabase.auth.admin.create_user({
            "email": user_email,
            "password": "SecurePassword123!",
            "email_confirm": True
        })
        user_id = user_res.user.id
        print(f"   [Éxito] Usuario creado: {user_email}")
        
        # 2. Crear un Supervisor
        print("\n2. Creando usuario supervisor...")
        sup_email = f"admin_{uuid.uuid4().hex[:6]}@securegallery.com"
        sup_res = supabase.auth.admin.create_user({
            "email": sup_email,
            "password": "SecurePassword123!",
            "email_confirm": True
        })
        sup_id = sup_res.user.id
        print(f"   [Éxito] Supervisor creado: {sup_email}")
        
        # Actualizar rol a supervisor
        supabase.table("profiles").update({"role": "supervisor"}).eq("id", sup_id).execute()
        print("   [Éxito] Rol actualizado a 'supervisor' en la DB.")

        # 3. Crear un Álbum para el Usuario Normal
        print("\n3. Creando álbum de prueba...")
        album_response = supabase.table("albums").insert({
            "user_id": user_id,
            "title": "Archivos Pendientes Demo",
            "description": "Álbum generado con archivos de prueba."
        }).execute()
        
        album_id = album_response.data[0]['id']
        print(f"   [Éxito] Álbum creado.")
        
        # 4. Crear un Archivo en Cuarentena
        print("\n4. Creando archivo en cuarentena...")
        file_response = supabase.table("files").insert({
            "album_id": album_id,
            "user_id": user_id,
            "storage_path": "quarantine/test_image.png",
            "file_type": "image",
            "status": "quarantined",
            "analysis_metadata": {"stego_entropy": 95.4, "stego_detected": True}
        }).execute()
        print("   [Éxito] Archivo en cuarentena insertado en la base de datos.")
        
        # 5. Verificando Bucket
        print("\n5. Verificando Bucket de imágenes...")
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        
        if "secure-gallery-images" not in bucket_names:
            supabase.storage.create_bucket("secure-gallery-images", {"public": True})
            print("   [Éxito] Bucket 'secure-gallery-images' creado.")
        
        # 6. Mostrar resumen
        print("="*60)
        print(" CONFIGURACIÓN COMPLETADA EXITOSAMENTE ")
        print("="*60)
        print("Puedes iniciar sesión en el Frontend con las siguientes cuentas:\n")
        print("--- CUENTA DE USUARIO NORMAL ---")
        print(f"Email:    {user_email}")
        print("Password: SecurePassword123!")
        print(f"ID:       {user_id}\n")
        
        print("--- CUENTA DE SUPERVISOR ---")
        print(f"Email:    {sup_email}")
        print("Password: SecurePassword123!")
        print(f"ID:       {sup_id}")
        print("="*60)
        
    except Exception as e:
        print("\n[X] ERROR AL CONFIGURAR EL ENTORNO [X]")
        print(f"Detalle: {str(e)}")
        print("\nPor favor verifica que:")
        print("1. Tu archivo .env tenga la clave 'service_role' y no la 'anon' public key.")
        print("2. Tu database.sql se haya ejecutado completamente en Supabase.")

if __name__ == "__main__":
    setup_test_environment()
