from fastapi import APIRouter, Request, HTTPException
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
    Registro real de usuarios usando Supabase Auth.
    """
    try:
        response = supabase.auth.admin.create_user({
            "email": user.email,
            "password": user.password,
            "email_confirm": True,
            "user_metadata": {
                "username": user.username or ""
            }
        })
    except Exception as exc:
        raise HTTPException(status_code=400, detail=f"Error al registrar usuario: {str(exc)}")

    created_user = None
    if hasattr(response, "user"):
        created_user = response.user
    elif isinstance(response, dict):
        created_user = response.get("user")

    if not created_user:
        raise HTTPException(status_code=400, detail="No se pudo crear el usuario en Supabase.")

    return {
        "message": "Usuario registrado exitosamente.",
        "user_id": getattr(created_user, "id", None) or created_user.get("id")
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
