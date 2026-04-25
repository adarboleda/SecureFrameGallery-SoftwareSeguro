from fastapi import APIRouter, HTTPException
from app.services.supabase_client import supabase

router = APIRouter()

def _require_supervisor(supervisor_id: str):
    prof = supabase.table("profiles").select("role").eq("id", supervisor_id).execute()
    if not prof.data or prof.data[0]["role"] != "supervisor":
        raise HTTPException(status_code=403, detail="Solo supervisores pueden realizar esta acción.")

@router.get("/users")
async def list_users(supervisor_id: str):
    """Lista todos los usuarios del sistema para el supervisor."""
    _require_supervisor(supervisor_id)
    
    users_list = supabase.auth.admin.list_users()
    result = []
    for u in users_list.users:
        profile = supabase.table("profiles").select("role").eq("id", u.id).execute()
        role = profile.data[0]["role"] if profile.data else "user"
        result.append({
            "id": u.id,
            "email": u.email,
            "username": u.user_metadata.get("username", "") if u.user_metadata else "",
            "role": role
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
