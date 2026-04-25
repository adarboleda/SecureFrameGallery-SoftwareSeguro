from fastapi import FastAPI
from slowapi.errors import RateLimitExceeded
from slowapi import _rate_limit_exceeded_handler
from app.core.security import limiter

# Importamos los routers
from app.api.routes import auth, albums, files, supervisor, public

from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Secure Frame Gallery - Security API")

# Configuración estricta de CORS (RF05 mitigación perimetral)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Configuración de Limiter
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# Registro de rutas (Modular)
app.include_router(public.router, prefix="/api/public", tags=["Acceso Público (Visitantes)"])
app.include_router(auth.router, prefix="/api/auth", tags=["Autenticación"])
app.include_router(albums.router, prefix="/api/albums", tags=["Álbumes"])
app.include_router(files.router, prefix="/api", tags=["Archivos"]) # Dejamos el prefix /api para mantener la compatibilidad con /api/upload
app.include_router(supervisor.router, prefix="/api/supervisor", tags=["Supervisor"])

@app.get("/")
def root():
    return {"message": "API de Secure Frame Gallery funcionando en Clean Architecture."}
