from datetime import datetime, timedelta, timezone
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
    except Exception:
        raise HTTPException(status_code=400, detail="No se pudo registrar la cuenta.")

    created_user = None
    if hasattr(response, "user"):
        created_user = response.user
    elif isinstance(response, dict):
        created_user = response.get("user")

    if not created_user:
        raise HTTPException(status_code=400, detail="No se pudo registrar la cuenta.")

    return {
        "message": "Usuario registrado exitosamente.",
        "user_id": getattr(created_user, "id", None) or created_user.get("id")
    }


@router.post("/login")
@limiter.limit("10/minute")
async def login_user(request: Request, payload: dict):
    email = (payload.get("email") or "").strip().lower()
    password = payload.get("password") or ""
    client_ip = request.client.host if request.client else ""

    if not email or not password:
        raise HTTPException(status_code=400, detail="Credenciales inválidas.")

    # Check temporary lockout
    attempts = supabase.table("auth_attempts").select("*").eq("email", email).execute()
    if attempts.data:
        record = attempts.data[0]
        locked_until = record.get("locked_until")
        if locked_until:
            try:
                locked_dt = datetime.fromisoformat(locked_until.replace("Z", "+00:00"))
                if locked_dt > datetime.now(timezone.utc):
                    raise HTTPException(status_code=429, detail="Cuenta bloqueada temporalmente.")
            except ValueError:
                pass

    try:
        response = supabase.auth.sign_in_with_password({
            "email": email,
            "password": password
        })
    except Exception:
        _record_failed_login(email, client_ip)
        raise HTTPException(status_code=401, detail="Credenciales inválidas.")

    session = None
    user = None
    if hasattr(response, "session"):
        session = response.session
        user = response.user
    elif isinstance(response, dict):
        session = response.get("session")
        user = response.get("user")

    if not session or not user:
        _record_failed_login(email, client_ip)
        raise HTTPException(status_code=401, detail="Credenciales inválidas.")

    _reset_login_attempts(email)

    return {
        "access_token": getattr(session, "access_token", None) or session.get("access_token"),
        "refresh_token": getattr(session, "refresh_token", None) or session.get("refresh_token"),
        "user_id": getattr(user, "id", None) or user.get("id")
    }


def _record_failed_login(email: str, client_ip: str) -> None:
    now = datetime.now(timezone.utc)
    record = supabase.table("auth_attempts").select("*").eq("email", email).execute()
    if record.data:
        attempts = int(record.data[0].get("attempts") or 0) + 1
        locked_until = None
        if attempts >= 5:
            locked_until = (now + timedelta(minutes=15)).isoformat()
            attempts = 0
        supabase.table("auth_attempts").update({
            "attempts": attempts,
            "locked_until": locked_until,
            "last_attempt_at": now.isoformat(),
            "last_ip": client_ip
        }).eq("email", email).execute()
    else:
        supabase.table("auth_attempts").insert({
            "email": email,
            "attempts": 1,
            "locked_until": None,
            "last_attempt_at": now.isoformat(),
            "last_ip": client_ip
        }).execute()


def _reset_login_attempts(email: str) -> None:
    supabase.table("auth_attempts").update({
        "attempts": 0,
        "locked_until": None
    }).eq("email", email).execute()

@router.get("/role/{user_id}")
async def get_user_role(user_id: str):
    """
    Retorna el rol del usuario especificado consultando la tabla profiles.
    """
    response = supabase.table("profiles").select("role").eq("id", user_id).execute()
    if not response.data:
        return {"role": "user"}
    return {"role": response.data[0]["role"]}
