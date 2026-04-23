-- ==========================================
-- 1. TIPOS DE DATOS PERSONALIZADOS (ENUMS)
-- Previenen inyección de estados inválidos
-- ==========================================
CREATE TYPE user_role AS ENUM ('user', 'supervisor');
CREATE TYPE album_status AS ENUM ('pending', 'approved', 'rejected');
CREATE TYPE album_privacy AS ENUM ('public', 'private');
CREATE TYPE image_status AS ENUM ('processing', 'clean', 'quarantined', 'rejected');

-- ==========================================
-- 2. TABLAS DEL SISTEMA
-- ==========================================

-- Tabla Profiles: Extiende la tabla nativa auth.users de Supabase
-- [Requisito RF01: Autenticación Segura y Roles]
CREATE TABLE public.profiles (
    id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
    role user_role DEFAULT 'user' NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla Albums: Gestión de las colecciones de los usuarios
-- [Requisito RF02: Gestión de Álbumes - Título, Descripción, Privacidad, Estado]
CREATE TABLE public.albums (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    privacy album_privacy DEFAULT 'private' NOT NULL,
    status album_status DEFAULT 'pending' NOT NULL, -- "Pendiente de Revisión" por defecto
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Tabla Images: El núcleo del proyecto y la cuarentena
-- [Requisito RF03 y RF04: Detección de Esteganografía y Revisión Manual]
CREATE TABLE public.images (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    album_id UUID REFERENCES public.albums(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
    storage_path TEXT NOT NULL, -- La ruta física en el Bucket de Supabase Storage
    status image_status DEFAULT 'processing' NOT NULL, -- Pasa a 'clean' o 'quarantined' tras el análisis Python
    analysis_metadata JSONB, -- Almacena los resultados del LSB/Histograma para que el Supervisor sepa "por qué fue marcada"
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ==========================================
-- 3. AUTOMATIZACIÓN DE SEGURIDAD (TRIGGER)
-- ==========================================

-- Esta función crea un perfil automáticamente con rol 'user' cada vez que 
-- alguien se registra en el sistema de autenticación de Supabase.
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
ALTER TABLE public.images ENABLE ROW LEVEL SECURITY;

-- Otorgar permisos a las tablas existentes
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO postgres, anon, authenticated, service_role;

-- Otorgar permisos a las secuencias (para los IDs auto incrementales si los hay)
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO postgres, anon, authenticated, service_role;
