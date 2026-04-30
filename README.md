# 🛡️ SecureFrame Gallery — Software Seguro

**SecureFrame Gallery** es un proyecto integrador enfocado en el *"Desarrollo Seguro de una galería multimedia pública con detección de esteganografía y gestión de riesgos en el SDLC"*.

Este repositorio implementa una solución *Full-Stack* (FastAPI + Next.js + Supabase) que no solo provee una plataforma estética y funcional, sino que está diseñada bajo estrictos principios de **Security by Design** y **Clean Architecture**, mitigando amenazas que van desde ataques XSS hasta vectores avanzados como la exfiltración de datos vía **Esteganografía LSB**.

---

## 📁 Estructura del Proyecto

```
SecureFrameGallery-SoftwareSeguro/
├── app/                        # Backend: FastAPI (Clean Architecture)
│   ├── api/
│   │   └── routes/
│   │       ├── auth.py         # RF01: Autenticación Argon2id + Rate Limiting
│   │       ├── albums.py       # RF02: Gestión de álbumes con sanitización XSS
│   │       ├── files.py        # RF03/RF04: Subida segura (imágenes + PDFs)
│   │       ├── images.py       # RF03/RF04: Subida exclusiva de imágenes (legacy)
│   │       ├── public.py       # RF05: Endpoints públicos con cabeceras de seguridad
│   │       ├── supervisor.py   # RF04: Flujo de revisión y cuarentena
│   │       └── admin.py        # Gestión de usuarios (listado y roles)
│   ├── core/
│   │   ├── config.py           # Carga de variables de entorno
│   │   └── security.py        # Rate limiter global (SlowAPI)
│   ├── models/
│   │   └── schemas.py          # Modelos Pydantic (UserRegister, AlbumCreate, Decision)
│   ├── services/
│   │   ├── supabase_client.py  # Cliente singleton de Supabase
│   │   ├── file_analysis.py    # Motor de análisis: LSB + Chi-Square + DCT + PDF
│   │   └── image_analysis.py   # Análisis LSB exclusivo para imágenes
│   └── main.py                 # Punto de entrada FastAPI + CORS + Rate Limiting
├── frontend/                   # Frontend: Next.js 16 (App Router)
│   └── src/
│       ├── app/
│       │   ├── page.tsx              # Galería pública + búsqueda + lightbox
│       │   ├── dashboard/page.tsx    # Panel de usuario (mis álbumes)
│       │   ├── albums/
│       │   │   ├── new/page.tsx      # Crear nuevo álbum
│       │   │   └── [id]/page.tsx     # Detalle de álbum + subida de archivos
│       │   ├── supervisor/page.tsx   # Panel de supervisor (álbumes + cuarentena)
│       │   ├── quarantine/page.tsx   # Reporte de análisis forense de un archivo
│       │   ├── admin/users/page.tsx  # Gestión de usuarios (rol supervisor)
│       │   ├── login/page.tsx        # Inicio de sesión (Supabase Auth)
│       │   └── register/page.tsx     # Registro de usuario
│       ├── services/
│       │   ├── api.ts                # Cliente HTTP centralizado (apiFetch)
│       │   ├── album.service.ts      # CRUD de álbumes (público, usuario, supervisor)
│       │   └── file.service.ts       # Subida, cuarentena, decisiones sobre archivos
│       ├── schemas/
│       │   ├── auth.schema.ts        # Validación Zod: login y registro
│       │   └── album.schema.ts       # Validación Zod: creación de álbumes
│       └── lib/
│           └── supabase.ts           # Cliente Supabase JS (Auth + Storage)
├── database.sql                # Schema PostgreSQL completo para Supabase
├── create_test_data.py         # Generador automático de datos de prueba
├── ataque_imagen.py            # Script de prueba: esteganografía LSB sobre imagen
├── ataque_pdf.py               # Script de prueba: PDF con JS malicioso embebido
├── .env.example                # Plantilla de variables de entorno del backend
└── README.md
```

---

## 🏗️ Arquitectura y Tecnologías

El proyecto está rigurosamente separado en dos componentes principales para garantizar la separación de responsabilidades y minimizar la superficie de ataque.

### 🐍 Backend (FastAPI — API Segura & Motor de Análisis)

Desarrollado bajo **Clean Architecture** (separación en Routers, Servicios y Modelos).

| Librería | Versión | Propósito de Seguridad |
|---|---|---|
| **FastAPI** | latest | Framework asíncrono, validación estricta via Pydantic |
| **Pydantic** | v2 | Validación de tipos en todos los payloads entrantes |
| **Passlib (Argon2id)** | latest | Hashing de contraseñas — ganador del Password Hashing Competition |
| **Bleach** | latest | Sanitización XSS de títulos y descripciones de álbumes |
| **SlowAPI** | latest | Rate limiting (5/min registro, 10/min álbumes) |
| **python-magic** | latest | Validación de MIME types por Magic Bytes (no por extensión) |
| **Pillow** | latest | Procesamiento de imágenes + stripping de EXIF |
| **NumPy** | latest | Análisis matricial de planos de bits (LSB) |
| **SciPy** | latest | Ataque estadístico Chi-cuadrado (detección de esteganografía) |
| **PyMuPDF (fitz)** | latest | Análisis de PDFs: JS embebido, widgets con scripts, archivos ocultos |
| **Supabase-py** | v2 | Cliente ORM para PostgreSQL + Storage (queries parametrizadas) |
| **python-dotenv** | latest | Carga segura de variables de entorno |

### ⚛️ Frontend (Next.js 16 — Interfaz de Usuario)

Desarrollado bajo **Clean Architecture** (separación en `/services`, `/schemas` y páginas React puras).

| Librería | Versión | Propósito |
|---|---|---|
| **Next.js** | 16.2.4 | App Router, cabeceras HTTP de seguridad desde el servidor |
| **React** | 19.2.4 | UI declarativa con estados y efectos |
| **TypeScript** | ^5 | Tipado estático para prevenir errores en tiempo de compilación |
| **Tailwind CSS** | ^4 | Estilos utilitarios |
| **Shadcn UI / Base UI** | latest | Componentes de UI accesibles |
| **Zod** | ^4.3.6 | Validación isomórfica de formularios antes de enviar al servidor |
| **React Hook Form** | ^7 | Manejo de formularios con resolvers Zod |
| **@supabase/supabase-js** | ^2.104.0 | Autenticación JWT + Signed URLs para cuarentena |
| **Axios** | ^1.15.2 | Cliente HTTP alternativo (usado en algunos servicios) |
| **Lucide React** | ^1.8.0 | Iconografía |

### 🗄️ Base de Datos & Almacenamiento (Supabase)

- **PostgreSQL**: Tablas `profiles`, `albums` y `files` con tipos ENUM propios.
- **RLS (Row Level Security)**: Activado a nivel de BD para impedir accesos cruzados.
- **Trigger Automático**: Al crear un usuario en `auth.users`, un trigger PostgreSQL inserta automáticamente un perfil en `public.profiles` con rol `'user'`.
- **Storage Bucket único** (`secure-gallery-images`): Organizado en carpetas:
  - `uploads/` → Archivos limpios (acceso público)
  - `quarantine/` → Archivos sospechosos (acceso solo con Signed URL de 60s)

---

## 🎯 Cumplimiento de Requisitos de Seguridad (RF01 - RF05)

### ✅ RF01: Autenticación Segura y Control de Acceso (RBAC)

**Archivos**: `app/api/routes/auth.py`, `database.sql`

1. **Argon2id** (`passlib[argon2]`) — hasheo de contraseñas con salado dinámico. La ruta `/api/auth/register` demuestra el proceso y retorna el hash generado para auditoría.
2. **Rate Limiter** (`slowapi`) — las rutas de registro están limitadas a **5 peticiones/minuto** por IP, bloqueando enumeración de usuarios y fuerza bruta.
3. **RBAC via JWT + BD**: La tabla `profiles` almacena el rol (`user` / `supervisor`). El endpoint `/api/auth/role/{user_id}` es consumido por el frontend para hacer redirecciones automáticas: los supervisores van a `/supervisor` y los usuarios normales van a `/dashboard`.
4. **Verificación de rol en cada endpoint protegido**: Todos los endpoints del supervisor consultan `profiles` y lanzan HTTP 403 si el rol no coincide.

### ✅ RF02: Prevención de Inyecciones (SQLi y XSS) en Álbumes

**Archivos**: `app/api/routes/albums.py`, `frontend/src/schemas/album.schema.ts`

1. **SQLi**: Mitigado por el cliente ORM de `supabase-py`, que parametriza todas las queries subyacentes (nunca se concatena SQL crudo).
2. **XSS en dos capas**:
   - *Frontend*: **Zod** valida que el título y descripción del álbum tengan formato correcto antes de enviar la petición.
   - *Backend*: `bleach.clean(title, tags=[], strip=True)` destruye cualquier etiqueta `<script>`, `<iframe>` u On-events en títulos y descripciones.
3. **Aprobación de supervisor**: Los álbumes no son visibles públicamente hasta que un supervisor los aprueba (`status: "approved"`).

### ✅ RF03: Validación Profunda de Archivos (MIME y EXIF Stripping)

**Archivos**: `app/api/routes/files.py`, `app/services/file_analysis.py`

1. **Magic Bytes** (`python-magic`): Se lee la cabecera hexadecimal del archivo en memoria para verificar su tipo real. Formatos aceptados: `image/jpeg`, `image/png`, `application/pdf`.
2. **Límite de tamaño**: 10 MB máximo por archivo (aumentado respecto a la versión anterior para soportar PDFs).
3. **EXIF Stripping** (`strip_exif`): Se reconstruye la imagen usando `Image.new()` + `paste()` en memoria, eliminando todos los metadatos EXIF (GPS, cámara, modelo, software) sin leer píxel por píxel (previene DoS por RAM).
4. **Verificación de álbum previo**: Solo se puede subir un archivo a un álbum **aprobado** que pertenezca al usuario. HTTP 403 si no cumple.

### ✅ RF04: Defensa en Profundidad (Detección LSB y Cuarentena)

**Archivos**: `app/services/file_analysis.py`, `app/services/image_analysis.py`, `app/api/routes/supervisor.py`

El motor de análisis aplica **tres técnicas complementarias** para imágenes y **análisis específico** para PDFs:

#### Imágenes:
| Técnica | Función | Criterio de Sospecha |
|---|---|---|
| **LSB Espacial** | `analyze_image_steganography` | Ratio de bits-1 entre 0.499 y 0.501 (entropía artificial) |
| **Chi-Cuadrado (PoV)** | `analyze_image_steganography` | p-value > 0.99 (distribución de frecuencias idéntica, antinatural) |
| **Pseudo-DCT** | `analyze_image_steganography` | Varianza de diferencias < 10.0 (suavidad antinatural en frecuencias) |

#### PDFs (PyMuPDF):
- JavaScript embebido en **enlaces** (`LINK_JAVASCRIPT`)
- JavaScript en **widgets/formularios** (`widget.script`)
- **Archivos ocultos embebidos** (`embedded_file_count > 0`)
- PDFs **encriptados o estructuralmente malformados** (excluye falsos positivos de Word/LibreOffice)

#### Flujo de cuarentena:
- Si `is_suspicious = True` → archivo guardado en `quarantine/{album_id}/` con `status: "quarantined"`
- Si `is_suspicious = False` → archivo guardado en `uploads/{album_id}/` con `status: "clean"`
- El supervisor revisa con **Signed URL de 60 segundos** (generado en el frontend via Supabase JS)
- Decisión: **Aprobar** (mueve de `quarantine/` → `uploads/` en Storage + actualiza BD) o **Rechazar** (elimina del Storage + marca como `rejected`)

### ✅ RF05: Seguridad Perimetral y Cabeceras HTTP

**Archivos**: `frontend/next.config.ts`, `app/main.py`, `app/api/routes/public.py`

1. **Content-Security-Policy (CSP)** en Next.js (`next.config.ts`):
   ```
   default-src 'self'; 
   img-src 'self' https://*.supabase.co blob: data:; 
   script-src 'self' 'unsafe-eval' 'unsafe-inline'; 
   style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; 
   font-src 'self' https://fonts.gstatic.com data:; 
   connect-src 'self' http://localhost:8000 http://127.0.0.1:8000 https://*.supabase.co;
   ```
2. **X-Content-Type-Options: nosniff** — previene ataques de confusión de tipo MIME tanto en el backend (`public.py`) como en el frontend (Next.js headers).
3. **CORS restrictivo** en FastAPI (`main.py`) — configurado con `allow_origins` para controlar orígenes autorizados.
4. **CSP adicional en endpoints públicos**: El router `/api/public` inyecta cabeceras adicionales de seguridad en las respuestas del backend.

---

## ✨ Funcionalidades Implementadas

### 🌐 Galería Pública (`/`)
- Grid responsivo de álbumes públicos aprobados con preview de la primera imagen
- **Búsqueda en tiempo real** por título y descripción (filtrado client-side)
- **Lightbox** para visualización de imágenes a pantalla completa con click
- **Visor de PDF embebido** via `<iframe>` con toolbar controlado
- Sesión de usuario: botón de acceso al panel o login/registro si no está autenticado

### 👤 Panel de Usuario (`/dashboard`)
- Vista de álbumes propios con estado (Aprobado / Pendiente / Rechazado)
- Estadísticas: total de álbumes, aprobados y pendientes
- Redirección automática de supervisores a `/supervisor`
- Navegación inferior adaptada a móvil (Bottom Nav)

### 📁 Gestión de Álbumes (`/albums/new`, `/albums/[id]`)
- Formulario de creación con validación Zod + React Hook Form
- Vista de detalle del álbum con subida de archivos (imágenes y PDFs)
- Visualización de todos los archivos del propietario (incluyendo en cuarentena con Signed URL)

### 🔐 Panel de Supervisor (`/supervisor`)
- **Dashboard con tabs** (Álbumes Pendientes / Cuarentena)
- Badges con contadores en tiempo real por cada tab
- **Enriquecimiento de datos**: muestra el email y username del propietario en cada álbum/archivo (via `/api/admin/users`)
- Decisión individual por álbum (Aprobar / Rechazar) con feedback visual
- Acceso a reporte forense individual por archivo

### 🔬 Reporte de Análisis Forense (`/quarantine?fileId=...`)
- Vista dividida: preview del archivo (imagen o PDF embebido) + panel de métricas
- Muestra entropía LSB, tipo de detección y propietario
- **Registros de análisis en español** con traducciones automáticas
- Decisión (Rechazar / Aprobar falso positivo) con redirect automático

### 👥 Gestión de Usuarios (`/admin/users`)
- Listado de todos los usuarios del sistema (solo supervisores)
- Capacidad de cambiar el rol de cualquier usuario

### 🔑 Autenticación (`/login`, `/register`)
- Login y registro vía Supabase Auth (JWT)
- Validación Zod antes de cualquier petición al servidor

---

## 🔌 API Endpoints

### Públicos (`/api/public`)
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/public/albums` | Lista álbumes aprobados (con cabeceras CSP) |
| `GET` | `/api/public/albums/{id}/files` | Archivos limpios de un álbum público |
| `GET` | `/api/public/albums/{id}/my-files` | Todos los archivos del propietario (signed URLs incluidas) |

### Autenticación (`/api/auth`)
| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/auth/register` | Registro con hash Argon2id (5/min por IP) |
| `GET` | `/api/auth/role/{user_id}` | Retorna el rol del usuario |

### Álbumes (`/api/albums`)
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/albums/my?user_id=...` | Álbumes del usuario autenticado |
| `POST` | `/api/albums/request` | Solicitar nuevo álbum (10/min, sanitización XSS) |
| `GET` | `/api/albums/{id}` | Detalle de un álbum por ID |

### Archivos (`/api`)
| Método | Endpoint | Descripción |
|---|---|---|
| `POST` | `/api/upload` | Subida segura de imágenes y PDFs (Magic Bytes + EXIF + LSB/Chi/DCT/PDF) |

### Supervisor (`/api/supervisor`)
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/supervisor/albums?supervisor_id=...` | Álbumes pendientes de aprobación |
| `PATCH` | `/api/supervisor/albums/{id}` | Aprobar o rechazar un álbum |
| `GET` | `/api/supervisor/quarantine?supervisor_id=...` | Archivos en cuarentena |
| `PATCH` | `/api/supervisor/quarantine/{id}` | Aprobar (mover a público) o rechazar (eliminar) un archivo |

### Admin (`/api/admin`)
| Método | Endpoint | Descripción |
|---|---|---|
| `GET` | `/api/admin/users?supervisor_id=...` | Lista de todos los usuarios con email y username |
| `PATCH` | `/api/admin/users/{id}/role` | Actualizar rol de un usuario |

---

## 🚀 Guía de Instalación y Ejecución Local

### Prerrequisitos

- **Python 3.12+** — [descargar](https://www.python.org/downloads/)
- **Node.js 18+** — [descargar](https://nodejs.org/)
- **Una instancia de Supabase** activa con:
  - Proyecto creado en [supabase.com](https://supabase.com)
  - Schema de BD cargado (ver paso 0)
  - Un Storage Bucket llamado `secure-gallery-images`

---

### Paso 0: Configurar la Base de Datos en Supabase

1. Ve a tu proyecto Supabase → **SQL Editor**
2. Copia y ejecuta el contenido completo de `database.sql`

   Esto creará:
   - Los tipos ENUM (`user_role`, `album_status`, `file_status`, `album_privacy`)
   - Las tablas `profiles`, `albums` y `files` con sus FK y columnas
   - El trigger automático para crear perfiles al registrarse
   - RLS activado en todas las tablas
   - Permisos de acceso para los roles de Supabase

3. Ve a **Storage** → crea un bucket llamado **`secure-gallery-images`** (puede ser público para las imágenes de la galería o privado; los archivos de cuarentena siempre se acceden via Signed URLs).

---

### Paso 1: Clonar y Configurar Variables de Entorno

```bash
git clone https://github.com/tu-usuario/SecureFrameGallery-SoftwareSeguro.git
cd SecureFrameGallery-SoftwareSeguro
```

**Backend** — crea el archivo `.env` en la raíz del proyecto:

```bash
# .env (raíz del proyecto)
SUPABASE_URL="https://tu-proyecto.supabase.co"
SUPABASE_KEY="tu-service-role-key"    # ⚠️ Usa la service_role key, NO la anon key
```

**Frontend** — crea el archivo `.env.local` dentro de la carpeta `frontend/`:

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL="http://localhost:8000"
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-public-key"    # Usa la anon/public key
```

> Puedes encontrar estas claves en: Supabase → tu proyecto → **Project Settings** → **API**

---

### Paso 2: Levantar el Backend (FastAPI)

```bash
# Desde la raíz del proyecto
python -m venv venv

# Activar entorno virtual:
# En Windows:
venv\Scripts\activate
# En macOS/Linux:
source venv/bin/activate

# Instalar dependencias
pip install -r requirements.txt

# Iniciar el servidor de desarrollo
uvicorn app.main:app --reload
```

✅ La API estará disponible en **http://localhost:8000**  
📚 Documentación interactiva (Swagger): **http://localhost:8000/docs**  
📖 Documentación alternativa (ReDoc): **http://localhost:8000/redoc**

> **Nota para Windows**: Si `python-magic` da error, instala también `python-magic-bin`:
> ```bash
> pip install python-magic-bin
> ```

---

### Paso 3: Levantar el Frontend (Next.js)

```bash
# Abre una nueva terminal
cd frontend

# Instalar dependencias
npm install

# Iniciar el servidor de desarrollo
npm run dev
```

✅ La aplicación estará disponible en **http://localhost:3000**

---

### Paso 4: Datos de Prueba (Opcional)

Para interactuar rápidamente con la aplicación sin crear usuarios manualmente:

```bash
# Desde la raíz del proyecto (con venv activo)
python create_test_data.py
```

Este script crea en tu Supabase:
- Un **usuario normal** de prueba
- Un **usuario supervisor** de prueba

Las credenciales se imprimirán en la consola al finalizar.

---

### Paso 5: Scripts de Prueba de Seguridad (Opcional)

Para verificar que el sistema de detección funciona correctamente:

```bash
# Generar una imagen con esteganografía LSB embebida
python ataque_imagen.py

# Generar un PDF con JavaScript malicioso embebido
python ataque_pdf.py
```

Luego sube los archivos generados a través de la UI para verificar que el sistema los detecta y envía a cuarentena correctamente.

---

## 🗺️ Flujo de Usuario

```
Visitante               → / (Galería pública, búsqueda, lightbox)
                        → /login  /register

Usuario autenticado     → /dashboard (mis álbumes, estadísticas)
                        → /albums/new (solicitar álbum → estado: pending)
                        → /albums/[id] (ver detalle, subir archivos al álbum aprobado)

Supervisor              → /supervisor (tab álbumes pendientes + tab cuarentena)
                        → /quarantine?fileId=... (reporte forense de un archivo)
                        → /admin/users (gestión de roles de usuarios)
```

---

## 🔐 Notas de Seguridad Importantes

> **`SUPABASE_KEY` del backend**: Usa siempre la **`service_role`** key en el backend (solo vive en el servidor, nunca se expone al navegador). Esta clave permite operaciones administrativas como mover archivos entre buckets.

> **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** del frontend: Es segura para el navegador. Solo puede leer datos según las políticas RLS configuradas.

> **CORS**: En producción, cambia `allow_origins=["*"]` en `app/main.py` por los dominios exactos de tu frontend (ej: `["https://mi-app.vercel.app"]`).

> **Rate Limiting**: Los límites actuales son para desarrollo. En producción considera ajustar `SlowAPI` a límites más estrictos y agregar un backend de almacenamiento (Redis) para persistencia entre reinicios.

---

## 📋 Requisitos del Sistema (`requirements.txt`)

El backend requiere las siguientes dependencias principales de Python:

```
fastapi
uvicorn[standard]
python-dotenv
supabase
passlib[argon2]
bleach
slowapi
python-magic
pillow
numpy
scipy
pymupdf
python-multipart
```

---

*Proyecto desarrollado para el curso de **Desarrollo Seguro** — Implementación de una galería multimedia con análisis forense integrado.*