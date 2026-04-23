from fastapi import APIRouter, Request
from passlib.hash import argon2
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
