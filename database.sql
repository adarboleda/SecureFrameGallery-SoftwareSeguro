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

  -- Tabla Auth Attempts: bloqueo temporal por intentos fallidos
  CREATE TABLE public.auth_attempts (
    email TEXT PRIMARY KEY,
    attempts INTEGER DEFAULT 0 NOT NULL,
    locked_until TIMESTAMP WITH TIME ZONE,
    last_attempt_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    last_ip TEXT
  );

  -- Tabla Decision Audit: registra decisiones del supervisor
  CREATE TABLE public.decision_audit (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    supervisor_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    action TEXT NOT NULL,
    reason TEXT DEFAULT '',
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
ALTER TABLE public.decision_audit ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auth_attempts ENABLE ROW LEVEL SECURITY;

-- Otorgar permisos a las tablas existentes
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Otorgar permisos a las secuencias (para los IDs auto incrementales si los hay)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- ==========================================
-- 5. POLITICAS RLS (Row Level Security)
-- ==========================================

-- Profiles: cada usuario solo puede leer su propio perfil
CREATE POLICY "profiles_select_own"
ON public.profiles
FOR SELECT
TO authenticated
USING (auth.uid() = id);

-- Albums: el usuario puede crear y leer sus propios albumes
CREATE POLICY "albums_insert_own"
ON public.albums
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "albums_select_own"
ON public.albums
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

CREATE POLICY "albums_update_own"
ON public.albums
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Albums: lectura publica de albumes aprobados y publicos
CREATE POLICY "albums_select_public"
ON public.albums
FOR SELECT
TO anon
USING (status = 'approved' AND privacy = 'public');

-- Albums: supervisor puede leer y actualizar todo
CREATE POLICY "albums_supervisor_select"
ON public.albums
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'supervisor'
  )
);

CREATE POLICY "albums_supervisor_update"
ON public.albums
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'supervisor'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'supervisor'
  )
);

-- Files: el usuario puede insertar y leer sus propios archivos
CREATE POLICY "files_insert_own"
ON public.files
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "files_select_own"
ON public.files
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Files: supervisor puede leer y actualizar todo
CREATE POLICY "files_supervisor_select"
ON public.files
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'supervisor'
  )
);

CREATE POLICY "files_supervisor_update"
ON public.files
FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'supervisor'
  )
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'supervisor'
  )
);

-- Decision Audit: supervisor puede insertar y leer
CREATE POLICY "decision_audit_insert_supervisor"
ON public.decision_audit
FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'supervisor'
  )
);

CREATE POLICY "decision_audit_select_supervisor"
ON public.decision_audit
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role = 'supervisor'
  )
);