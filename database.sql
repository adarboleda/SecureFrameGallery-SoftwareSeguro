-- ==========================================
-- 0. LIMPIEZA PREVIA (RESET TOTAL)
-- Borra todo si ya existe para evitar errores
-- ==========================================
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
DROP FUNCTION IF EXISTS public.handle_new_user() CASCADE;

DROP TABLE IF EXISTS public.files CASCADE;
DROP TABLE IF EXISTS public.images CASCADE; -- Por si quedó la tabla vieja
DROP TABLE IF EXISTS public.albums CASCADE;
DROP TABLE IF EXISTS public.profiles CASCADE;

DROP TYPE IF EXISTS user_role CASCADE;
DROP TYPE IF EXISTS album_status CASCADE;
DROP TYPE IF EXISTS album_privacy CASCADE;
DROP TYPE IF EXISTS image_status CASCADE; -- Borra el tipo viejo
DROP TYPE IF EXISTS file_status CASCADE;  -- Borra el tipo nuevo para poder recrearlo

-- ==========================================
-- 1. TIPOS DE DATOS PERSONALIZADOS (ENUMS)
-- Previenen inyección de estados inválidos
-- ==========================================
CREATE TYPE user_role AS ENUM ('user', 'supervisor');
CREATE TYPE album_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE album_privacy AS ENUM ('public', 'private');
CREATE TYPE file_status AS ENUM ('processing', 'clean', 'quarantined', 'rejected');

-- ==========================================
-- 2. TABLAS DEL SISTEMA
-- ==========================================

-- Tabla Profiles: Extiende la tabla nativa auth.users de Supabase
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role user_role DEFAULT 'user' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla Albums: Gestión de las colecciones de los usuarios
CREATE TABLE public.albums (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    privacy album_privacy DEFAULT 'private' NOT NULL,
    status album_status DEFAULT 'pending' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla Files: El núcleo del proyecto y la cuarentena (soporta imágenes y PDFs)
CREATE TABLE public.files (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    storage_path TEXT NOT NULL,
    file_type TEXT DEFAULT 'image' NOT NULL,
    status file_status DEFAULT 'processing' NOT NULL,
    analysis_metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. AUTOMATIZACIÓN DE SEGURIDAD (TRIGGER)
-- ==========================================
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, role)
  VALUES (new.id, 'user');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- ==========================================
-- 4. HABILITAR SEGURIDAD A NIVEL DE FILA (RLS)
-- ==========================================
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.albums ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.files ENABLE ROW LEVEL SECURITY;

-- Otorgar permisos a las tablas existentes
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Otorgar permisos a las secuencias (para los IDs auto incrementales si los hay)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;