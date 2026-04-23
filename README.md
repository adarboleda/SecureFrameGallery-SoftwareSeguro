# 🛡️ SecureFrame Gallery - Software Seguro

**SecureFrame Gallery** es un proyecto integrador enfocado en el "Desarrollo Seguro de una galería multimedia pública con detección de esteganografía y gestión de riesgos en el SDLC".

Este repositorio implementa una solución *Full-Stack* (FastAPI + Next.js + Supabase) que no solo provee una plataforma estética y funcional, sino que está diseñada bajo estrictos principios de seguridad ("Security by Design") y Clean Architecture, mitigando amenazas que van desde ataques XSS hasta vectores avanzados como la exfiltración de datos vía **Esteganografía LSB** (Least Significant Bit).

---

## 🏗️ Arquitectura y Tecnologías

El proyecto está rigurosamente separado en dos componentes principales para garantizar la separación de responsabilidades y minimizar la superficie de ataque.

### 🐍 Backend (API Segura & Motor de Análisis)
Desarrollado bajo **Clean Architecture** (Separación de Routers, Lógica de Negocio y Modelos).
- **Python 3.12 + FastAPI**: Elegido por su velocidad, validación estricta de tipos nativa (Pydantic) y manejo asíncrono. Ideal para construir una API robusta y resistente a payloads malformados.
- **Pillow & Numpy**: Utilizados como el motor matemático para el análisis de los canales RGB. Se extrae el Bit Menos Significativo (LSB) de cada píxel para realizar un análisis de entropía que detecta alteraciones esteganográficas.
- **Python-Magic**: Para la validación profunda de *MIME types*, evitando la subida de ejecutables camuflados (ej. un `.exe` renombrado a `.jpg`).
- **Passlib (Argon2id)**: El estándar de la industria (ganador del Password Hashing Competition) utilizado para hashear contraseñas mitigando ataques de fuerza bruta y ataques por GPU.
- **Bleach**: Sanitización estricta de cadenas de texto (títulos y descripciones) previniendo inyecciones XSS.
- **SlowAPI**: Rate limiting integrado en FastAPI para mitigar escaneos automáticos y fuerza bruta.

### ⚛️ Frontend (Interfaz de Usuario)
Desarrollado bajo **Clean Architecture** (Separación en `/services`, `/schemas` y vistas React puras).
- **Next.js 14 (App Router) + React**: Proveen el framework visual. Next.js permite inyectar cabeceras de seguridad HTTP desde el servidor perimetral antes de llegar al navegador.
- **Tailwind CSS + Shadcn UI**: Proporcionan una estética premium, oscura ("Glassmorphism") sin comprometer la velocidad de carga.
- **Zod & React Hook Form**: Validación isomórfica. Todo formulario del usuario es validado estáticamente antes de enviar un solo byte al servidor.
- **Supabase JS**: SDK utilizado para autenticar a los usuarios mediante JWT y para firmar temporalmente (*Signed URLs*) las imágenes en cuarentena.

### 🗄️ Base de Datos & Almacenamiento
- **Supabase (PostgreSQL + Storage)**: 
  - *PostgreSQL*: Almacenamiento de usuarios, perfiles (con Enum de roles: `user`, `supervisor`), y álbumes.
  - *RLS (Row Level Security)*: Activado a nivel de base de datos para impedir que un usuario lea información que no le pertenece.
  - *Storage Buckets*: Sistema de almacenamiento segregado en dos "Buckets": uno de **Cuarentena** (Privado) y uno **Público** (Accesible solo en lectura).

---

## 🎯 Cumplimiento de Requisitos de Seguridad (RF01 - RF05)

A continuación, se detalla exactamente cómo se cumplen los requisitos del proyecto:

### ✅ RF01: Autenticación Segura y Control de Acceso (RBAC)
- **Dónde está**: `app/api/routes/auth.py` y Base de Datos (RLS).
- **Cómo se cumple**:
  1. Se implementó **Argon2id** (`passlib[argon2]`) como algoritmo de hashing con salado dinámico.
  2. Implementación de un **Rate Limiter** (`slowapi`) en las rutas de Login/Registro, bloqueando IPs tras múltiples intentos fallidos de registro (evitando enumeración de usuarios y fuerza bruta).
  3. A nivel de base de datos (`database.sql`), la tabla `profiles` fuerza el Rol (Usuario/Supervisor) que luego es validado criptográficamente vía el JWT de Supabase en el backend (`verify_jwt`).

### ✅ RF02: Prevención de Inyecciones (SQLi y XSS) en Álbumes
- **Dónde está**: `app/api/routes/albums.py`, `frontend/src/schemas/` y `frontend/src/app/dashboard/page.tsx`.
- **Cómo se cumple**:
  1. **SQLi**: Queda mitigado por defecto al utilizar el cliente ORM/Query Builder de Supabase/PostgreSQL, el cual parametriza todas las consultas subyacentes.
  2. **XSS**: Tenemos mitigación en dos capas. 
     - *Frontend*: **Zod** impide el envío de cadenas malformadas o caracteres excesivos.
     - *Backend*: Todo título y descripción pasa por **Bleach** (`bleach.clean(title)`), el cual destruye sistemáticamente cualquier etiqueta `<script>`, `<iframe>` u On-events, neutralizando ataques Cross-Site Scripting Almacenado. Además, los álbumes requieren la aprobación de un **Supervisor** para hacerse públicos.

### ✅ RF03: Validación Profunda de Archivos (MIME y EXIF Stripping)
- **Dónde está**: `app/api/routes/images.py` (`upload_secure_image`).
- **Cómo se cumple**:
  1. No nos fiamos de la extensión del archivo (`.jpg`). Utilizamos **`python-magic`** para leer los "Magic Bytes" de la cabecera hexadecimal del archivo en memoria y asegurar que sea un bloque de imagen válido.
  2. Mediante la librería **Pillow**, se reconstruye la imagen. En el proceso de guardado, la imagen se re-comprime intencionalmente. Esto destruye todos los metadatos **EXIF** (GPS, cámara, modelo, software de edición), previniendo fugas de información privada (Data Leakage).

### ✅ RF04: Defensa en Profundidad (Detección LSB y Cuarentena)
- **Dónde está**: `app/utils/security.py` (`analyze_lsb_steganography`) y `app/api/routes/supervisor.py`.
- **Cómo se cumple**:
  1. Se implementa un algoritmo de lectura binaria a bajo nivel. Por cada píxel de la imagen enviada, aislamos el Bit Menos Significativo (LSB). Se tabula la densidad de bits y se busca entropía anómala (una proporción perfecta cercana a `0.50` suele indicar que el ruido natural de la foto fue reemplazado por un payload binario encriptado - esteganografía).
  2. Si la foto es sospechosa, se guarda en el bucket cerrado de **Cuarentena** de Supabase y no en la galería pública.
  3. El rol de Supervisor puede revisar la imagen con un enlace firmado temporal (*Signed URL* de 60 segundos) y decidir si destruirla (`DELETE`) o aceptarla (falso positivo, moviéndola al bucket seguro).

### ✅ RF05: Seguridad Perimetral y Cabeceras HTTP
- **Dónde está**: `frontend/next.config.ts` y `app/main.py`.
- **Cómo se cumple**:
  1. En el frontend de Next.js, se inyectan cabeceras `Content-Security-Policy (CSP)` estrictas. Si de alguna manera lograran inyectar un script externo, el navegador abortará su ejecución (Solo se permite el dominio propio y Supabase).
  2. Inyección de `X-Content-Type-Options: nosniff` para evitar ataques de confusión de tipo MIME en el navegador del usuario.
  3. **CORS restrictivo** en FastAPI, bloqueando peticiones web desde orígenes no autorizados.

---

## 🚀 Despliegue y Ejecución Local

### Prerrequisitos
- Python 3.12+
- Node.js 18+
- Instancia activa de Supabase (Database + Storage)

### 1. Variables de Entorno
Clona este repositorio. En la raíz, renombra el archivo `.env.example` a `.env` y en la carpeta `frontend/` crea `.env.local`:
```bash
# Backend (.env)
SUPABASE_URL="https://tu-proyecto.supabase.co"
SUPABASE_KEY="tu-service-role-key"

# Frontend (frontend/.env.local)
NEXT_PUBLIC_API_URL="http://localhost:8000"
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-public-key"
```

### 2. Levantar el Backend (FastAPI)
```bash
python -m venv venv
source venv/bin/activate  # (En Windows: venv\Scripts\activate)
pip install -r requirements.txt
uvicorn app.main:app --reload
```
*La API estará documentada de forma automática en http://localhost:8000/docs*

### 3. Levantar el Frontend (Next.js)
```bash
cd frontend
npm install
npm run dev
```
*Accede a http://localhost:3000 para probar la aplicación completa.*

### 4. Datos de Prueba
Para interactuar rápidamente, puedes ejecutar el generador automático desde la raíz del proyecto. Este script creará de forma remota en tu Supabase un usuario normal y un supervisor.
```bash
python create_test_data.py
```