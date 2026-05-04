from supabase import create_client, Client
from app.core.config import settings

# Instanciamos el cliente de Supabase usando los settings
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)

# Cliente con service role para operaciones administrativas (Auth admin APIs)
supabase_admin: Client = create_client(
	settings.SUPABASE_URL,
	settings.SUPABASE_SERVICE_ROLE_KEY or settings.SUPABASE_KEY,
)
