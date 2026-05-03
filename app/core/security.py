from fastapi import HTTPException, Request
from slowapi import Limiter
from slowapi.util import get_remote_address
from app.services.supabase_client import supabase

# RF01: Rate Limiting para evitar ataques de fuerza bruta o DDoS
limiter = Limiter(key_func=get_remote_address)


def get_authenticated_user(request: Request):
	auth_header = request.headers.get("Authorization", "")
	if not auth_header.lower().startswith("bearer "):
		raise HTTPException(status_code=401, detail="Authorization token missing.")

	token = auth_header.split(" ", 1)[1].strip()
	if not token:
		raise HTTPException(status_code=401, detail="Authorization token missing.")

	try:
		response = supabase.auth.get_user(token)
	except Exception as exc:
		raise HTTPException(status_code=401, detail=f"Invalid token: {str(exc)}")

	user = None
	if hasattr(response, "user"):
		user = response.user
	elif isinstance(response, dict):
		user = response.get("user")

	if not user:
		raise HTTPException(status_code=401, detail="Invalid token.")

	return user


def get_user_id(user) -> str:
	return getattr(user, "id", None) or user.get("id")
