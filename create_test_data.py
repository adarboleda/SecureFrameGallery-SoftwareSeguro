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
        user_email = f"user1@securegallery.com"
        
        user_res = supabase.auth.admin.create_user({
            "email": user_email,
            "password": "user123",
            "email_confirm": True
        })
        user_id = user_res.user.id
        print(f"   [Éxito] Usuario creado: {user_email}")
        
        # 2. Crear un Supervisor
        print("\n2. Creando usuario supervisor...")
        sup_email = f"admin1@securegallery.com"
        sup_res = supabase.auth.admin.create_user({
            "email": sup_email,
            "password": "admin123",
            "email_confirm": True
        })
        sup_id = sup_res.user.id
        print(f"   [Éxito] Supervisor creado: {sup_email}")
        
        # Actualizar rol a supervisor
        supabase.table("profiles").update({"role": "supervisor"}).eq("id", sup_id).execute()
        print("   [Éxito] Rol actualizado a 'supervisor' en la DB.")
        
        # 5. Verificando Bucket
        print("\n5. Verificando Bucket de imágenes...")
        buckets = supabase.storage.list_buckets()
        bucket_names = [b.name for b in buckets]
        
        if "secure-gallery-images" not in bucket_names:
            supabase.storage.create_bucket("secure-gallery-images", {"public": True})
            print("   [Éxito] Bucket 'secure-gallery-images' creado (público).")
        else:
            # Asegurarse de que el bucket sea público
            try:
                supabase.storage.update_bucket("secure-gallery-images", {"public": True})
                print("   [Éxito] Bucket 'secure-gallery-images' verificado y puesto en modo público.")
            except Exception:
                print("   [Info] El bucket ya existe. Verifica manualmente que sea público en el Dashboard de Supabase.")
        
        # 6. Mostrar resumen
        print("="*60)
        print(" CONFIGURACIÓN COMPLETADA EXITOSAMENTE ")
        print("="*60)
        print("Puedes iniciar sesión en el Frontend con las siguientes cuentas:\n")
        print("--- CUENTA DE USUARIO NORMAL ---")
        print(f"Email:    {user_email}")
        print("Password: user123")
        print(f"ID:       {user_id}\n")
        
        print("--- CUENTA DE SUPERVISOR ---")
        print(f"Email:    {sup_email}")
        print("Password: admin123")
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
