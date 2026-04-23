from supabase import create_client, Client
from app.core.config import settings

# Instanciamos el cliente de Supabase usando los settings
supabase: Client = create_client(settings.SUPABASE_URL, settings.SUPABASE_KEY)
