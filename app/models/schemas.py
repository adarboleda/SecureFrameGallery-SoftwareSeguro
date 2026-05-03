import re
from typing import Literal
from pydantic import BaseModel, field_validator

class UserRegister(BaseModel):
    email: str
    password: str
    username: str | None = None

    # RF01: Política de contraseñas robustas (validación en backend)
    @field_validator("password")
    @classmethod
    def validate_password_strength(cls, v: str) -> str:
        if len(v) < 8:
            raise ValueError("La contraseña debe tener al menos 8 caracteres")
        if not re.search(r"[A-Z]", v):
            raise ValueError("La contraseña debe contener al menos una letra mayúscula")
        if not re.search(r"[a-z]", v):
            raise ValueError("La contraseña debe contener al menos una letra minúscula")
        if not re.search(r"[0-9]", v):
            raise ValueError("La contraseña debe contener al menos un número")
        if not re.search(r"[^A-Za-z0-9]", v):
            raise ValueError("La contraseña debe contener al menos un carácter especial")
        return v

class AlbumCreate(BaseModel):
    user_id: str
    title: str
    description: str
    privacy: str = "public"  # RF02: Privacidad inicial del álbum

class Decision(BaseModel):
    supervisor_id: str
    action: Literal["approve", "reject"]  # Solo acepta estos dos valores
