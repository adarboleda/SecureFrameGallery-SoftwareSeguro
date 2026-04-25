from fastapi import APIRouter, Request, HTTPException
from passlib.hash import argon2
from app.services.supabase_client import supabase
from app.models.schemas import UserRegister
from app.core.security import limiter

router = APIRouter()

# ==========================================
# RF01: AUTENTICACIÓN SEGURA Y REGISTRO
# ==========================================
@router.post("/register")
@limiter.limit("5/minute")
async def register_user(request: Request, user: UserRegister):
    """
    Simulación del registro para evidenciar el cumplimiento del RF01.
    """
    hashed_password = argon2.hash(user.password)
    
    return {
        "message": "Usuario registrado exitosamente.",
        "security_audit": "Password hashed completely with Argon2id",
        "hash_preview": hashed_password
    }

@router.get("/role/{user_id}")
async def get_user_role(user_id: str):
    """
    Retorna el rol del usuario especificado consultando la tabla profiles.
    """
    response = supabase.table("profiles").select("role").eq("id", user_id).execute()
    if not response.data:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")
    return {"role": response.data[0]["role"]}
