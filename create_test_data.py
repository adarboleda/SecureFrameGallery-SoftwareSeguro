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
        # 1. Crear un Usuario de Prueba
        print("1. Creando usuario de prueba...")
        # Generamos un email aleatorio para evitar colisiones si ejecutas el script varias veces
        email = f"demo_{uuid.uuid4().hex[:6]}@securegallery.com"
        
        # IMPORTANTE: Esto solo funciona si estás usando la SERVICE_ROLE key
        user = supabase.auth.admin.create_user({
            "email": email,
            "password": "SecurePassword123!",
            "email_confirm": True
        })
        user_id = user.user.id
        print(f"   [Éxito] Usuario creado: {email}")
        print(f"   [Éxito] ID del Usuario: {user_id}\n")
        
        # 2. Crear un Álbum para ese Usuario
        print("2. Creando álbum de prueba...")
        album_response = supabase.table("albums").insert({
            "user_id": user_id,
            "title": "Álbum Demo para Pruebas LSB",
            "description": "Álbum generado automáticamente por el script de configuración."
        }).execute()
        
        album_id = album_response.data[0]['id']
        print(f"   [Éxito] Álbum creado.")
        print(f"   [Éxito] ID del Álbum: {album_id}\n")
        
        # 3. Intentar crear el Bucket de Storage (si no existe)
        print("3. Verificando Bucket de imágenes...")
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        
        if "secure-gallery-images" not in bucket_names:
            supabase.storage.create_bucket("secure-gallery-images", {"public": True})
            print("   [Éxito] Bucket 'secure-gallery-images' creado en Storage.\n")
        else:
            print("   [Éxito] El bucket 'secure-gallery-images' ya existía.\n")
        
        # 4. Mostrar resumen
        print("="*60)
        print(" CONFIGURACION COMPLETADA ")
        print("="*60)
        print("Ve a Swagger UI (http://localhost:8000/docs) e ingresa estos UUIDs:")
        print(f"-> user_id:  {user_id}")
        print(f"-> album_id: {album_id}")
        print("="*60)
        
    except Exception as e:
        print("\n[X] ERROR AL CONFIGURAR EL ENTORNO [X]")
        print(f"Detalle: {str(e)}")
        print("\nPor favor verifica que:")
        print("1. Tu archivo .env tenga la clave 'service_role' y no la 'anon' public key.")
        print("2. Tu database.sql se haya ejecutado completamente en Supabase.")

if __name__ == "__main__":
    setup_test_environment()
