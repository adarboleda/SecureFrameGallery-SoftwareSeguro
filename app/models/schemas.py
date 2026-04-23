from pydantic import BaseModel

class UserRegister(BaseModel):
    email: str
    password: str

class AlbumCreate(BaseModel):
    user_id: str
    title: str
    description: str

class Decision(BaseModel):
    supervisor_id: str
    action: str # "approve" o "reject"
