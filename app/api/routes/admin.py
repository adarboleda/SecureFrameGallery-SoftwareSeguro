from fastapi import APIRouter, HTTPException
from app.services.supabase_client import supabase, supabase_admin

router = APIRouter()

def _require_supervisor(supervisor_id: str):
    prof = supabase_admin.table("profiles").select("role").eq("id", supervisor_id).execute()
    if not prof.data or prof.data[0]["role"] != "supervisor":
        raise HTTPException(status_code=403, detail="Solo supervisores pueden realizar esta acción.")

@router.get("/users")
async def list_users(supervisor_id: str):
    """Lista todos los usuarios del sistema para el supervisor."""
    _require_supervisor(supervisor_id)
    
    users_list = supabase_admin.auth.admin.list_users()
    users = None
    if hasattr(users_list, "users"):
        users = users_list.users
    elif isinstance(users_list, dict):
        users = users_list.get("users")
    elif isinstance(users_list, list):
        users = users_list

    if users is None:
        raise HTTPException(status_code=500, detail="No se pudo obtener la lista de usuarios.")

    result = []
    for u in users:
        profile = supabase_admin.table("profiles").select("role").eq("id", u.id).execute()
        role = profile.data[0]["role"] if profile.data else "user"
        result.append({
            "id": u.id,
            "email": u.email,
            "username": u.user_metadata.get("username", "") if u.user_metadata else "",
            "role": role,
            "is_suspended": bool(getattr(u, "banned_until", False))
        })
    return {"users": result}

@router.patch("/users/{user_id}/role")
async def update_user_role(user_id: str, supervisor_id: str, new_role: str):
    """Actualiza el rol de un usuario."""
    _require_supervisor(supervisor_id)
    
    if new_role not in ["user", "supervisor"]:
        raise HTTPException(status_code=400, detail="Rol inválido. Debe ser 'user' o 'supervisor'.")
    
    supabase.table("profiles").update({"role": new_role}).eq("id", user_id).execute()
    return {"message": f"Rol actualizado a '{new_role}'."}

@router.post("/users/{user_id}/suspend")
async def suspend_user(user_id: str, supervisor_id: str, suspend: bool):
    """Suspende o reactiva a un usuario."""
    _require_supervisor(supervisor_id)
    
    # Verificar que el usuario no sea supervisor
    profile = supabase_admin.table("profiles").select("role").eq("id", user_id).execute()
    if profile.data and profile.data[0]["role"] == "supervisor":
        raise HTTPException(status_code=403, detail="No se puede suspender a un administrador/supervisor.")
        
    ban_duration = "876000h" if suspend else "none"
    try:
        supabase_admin.auth.admin.update_user_by_id(user_id, {"ban_duration": ban_duration})
        status_msg = "suspendido" if suspend else "reactivado"
        return {"message": f"Usuario {status_msg} exitosamente."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error al cambiar estado del usuario: {str(e)}")
