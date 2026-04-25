import os
import sys
from supabase import create_client, Client
from dotenv import load_dotenv

def make_supervisor():
    print("Iniciando asignación de rol de Supervisor...\n")
    
    # 1. Cargar variables de entorno
    load_dotenv()
    SUPABASE_URL = os.getenv("SUPABASE_URL")
    SUPABASE_KEY = os.getenv("SUPABASE_KEY")
    
    if not SUPABASE_URL or not SUPABASE_KEY:
        print("[X] ERROR: Faltan variables de entorno SUPABASE_URL o SUPABASE_KEY en el archivo .env")
        sys.exit(1)
        
    supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)
    
    # 2. Pedir correo electrónico
    email = input("Ingresa el correo electrónico de la cuenta que quieres convertir en Supervisor: ").strip()
    
    if not email:
        print("[X] ERROR: Debes ingresar un correo.")
        sys.exit(1)
        
    try:
        # 3. Buscar el usuario por email
        response = supabase.table("profiles").select("id").eq("email", email)
        # Como supabase no expone el email en profiles de forma directa sin JOIN (ya que auth.users está protegida),
        # usaremos auth.admin.list_users() o pediremos el ID.
        # En la estructura actual, 'profiles' no tiene el email. Así que necesitamos usar la API de Auth.
        
        users_resp = supabase.auth.admin.list_users()
        users = users_resp.users
        
        target_user = None
        for u in users:
            if u.email == email:
                target_user = u
                break
                
        if not target_user:
            print(f"[X] ERROR: No se encontró ningún usuario con el correo: {email}")
            print("Asegúrate de que el usuario ya se haya registrado en la aplicación.")
            sys.exit(1)
            
        user_id = target_user.id
        print(f"-> Usuario encontrado. ID: {user_id}")
        
        # 4. Actualizar el rol en la tabla profiles
        print("-> Asignando rol de 'supervisor'...")
        update_resp = supabase.table("profiles").update({"role": "supervisor"}).eq("id", user_id).execute()
        
        if update_resp.data:
            print("\n[ÉXITO] El usuario ahora es SUPERVISOR.")
            print("Ya puedes iniciar sesión en la aplicación web con esa cuenta y acceder a las pantallas de Supervisor.")
        else:
            print("\n[X] ERROR: No se pudo actualizar el rol. Asegúrate de que el trigger on_auth_user_created haya creado el perfil.")
            
    except Exception as e:
        print("\n[X] ERROR AL ASIGNAR EL ROL [X]")
        print(f"Detalle: {str(e)}")
        print("\nPor favor verifica que:")
        print("1. Tu archivo .env tenga la clave 'service_role' (SUPABASE_KEY) y no la 'anon' public key.")
        print("2. Tienes permisos de administrador en tu proyecto de Supabase.")

if __name__ == "__main__":
    make_supervisor()
