## 🛡️ SecureFrame Gallery — Software Seguro

**SecureFrame Gallery** es un proyecto integrador enfocado en el _"Desarrollo Seguro de una galería multimedia pública con detección de esteganografía y gestión de riesgos en el SDLC"_.

Este repositorio implementa una solución _Full-Stack_ (FastAPI + Next.js + Supabase) que no solo provee una plataforma estética y funcional, sino que está diseñada bajo estrictos principios de **Security by Design** y **Clean Architecture**, mitigando amenazas que van desde ataques XSS hasta vectores avanzados como la exfiltración de datos vía **Esteganografía LSB**.

---

## 📑 Tabla de Contenidos

1. [Estructura del Proyecto](#📁-estructura-del-proyecto)
2. [Requisitos de Seguridad (RF01-RF05)](#🎯-cumplimiento-de-requisitos-de-seguridad-rf01---rf05)
3. [Tecnologías](#🏗️-arquitectura-y-tecnologías)
4. [Instalación](#🚀-guía-de-instalación-y-ejecución-local)
5. [Scripts de Prueba](#paso-5-scripts-de-prueba-de-seguridad-opcional)
6. [Documentación de Seguridad](#📚-documentación-de-seguridad)
7. [Notas de Seguridad](#🔐-notas-de-seguridad-importantes)
8. [Troubleshooting](#🐛-troubleshooting)
9. [Quick Start](#🚀-ejecución-rápida-quick-start)

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

| Librería               | Versión | Propósito de Seguridad                                               |
| ---------------------- | ------- | -------------------------------------------------------------------- |
| **FastAPI**            | latest  | Framework asíncrono, validación estricta via Pydantic                |
| **Pydantic**           | v2      | Validación de tipos en todos los payloads entrantes                  |
| **Passlib (Argon2id)** | latest  | Hashing de contraseñas — ganador del Password Hashing Competition    |
| **Bleach**             | latest  | Sanitización XSS de títulos y descripciones de álbumes               |
| **SlowAPI**            | latest  | Rate limiting (5/min registro, 10/min álbumes)                       |
| **python-magic**       | latest  | Validación de MIME types por Magic Bytes (no por extensión)          |
| **Pillow**             | latest  | Procesamiento de imágenes + stripping de EXIF                        |
| **NumPy**              | latest  | Análisis matricial de planos de bits (LSB)                           |
| **SciPy**              | latest  | Ataque estadístico Chi-cuadrado (detección de esteganografía)        |
| **PyMuPDF (fitz)**     | latest  | Análisis de PDFs: JS embebido, widgets con scripts, archivos ocultos |
| **Supabase-py**        | v2      | Cliente ORM para PostgreSQL + Storage (queries parametrizadas)       |
| **python-dotenv**      | latest  | Carga segura de variables de entorno                                 |

### ⚛️ Frontend (Next.js 16 — Interfaz de Usuario)

Desarrollado bajo **Clean Architecture** (separación en `/services`, `/schemas` y páginas React puras).

| Librería                  | Versión  | Propósito                                                        |
| ------------------------- | -------- | ---------------------------------------------------------------- |
| **Next.js**               | 16.2.4   | App Router, cabeceras HTTP de seguridad desde el servidor        |
| **React**                 | 19.2.4   | UI declarativa con estados y efectos                             |
| **TypeScript**            | ^5       | Tipado estático para prevenir errores en tiempo de compilación   |
| **Tailwind CSS**          | ^4       | Estilos utilitarios                                              |
| **Shadcn UI / Base UI**   | latest   | Componentes de UI accesibles                                     |
| **Zod**                   | ^4.3.6   | Validación isomórfica de formularios antes de enviar al servidor |
| **React Hook Form**       | ^7       | Manejo de formularios con resolvers Zod                          |
| **@supabase/supabase-js** | ^2.104.0 | Autenticación JWT + Signed URLs para cuarentena                  |
| **Axios**                 | ^1.15.2  | Cliente HTTP alternativo (usado en algunos servicios)            |
| **Lucide React**          | ^1.8.0   | Iconografía                                                      |

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
   - _Frontend_: **Zod** valida que el título y descripción del álbum tengan formato correcto antes de enviar la petición.
   - _Backend_: `bleach.clean(title, tags=[], strip=True)` destruye cualquier etiqueta `<script>`, `<iframe>` u On-events en títulos y descripciones.
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

| Técnica                | Función                       | Criterio de Sospecha                                                 |
| ---------------------- | ----------------------------- | -------------------------------------------------------------------- |
| **LSB Espacial**       | `analyze_image_steganography` | Ratio de bits-1 entre 0.499 y 0.501 (entropía artificial)            |
| **Chi-Cuadrado (PoV)** | `analyze_image_steganography` | p-value > 0.99 (distribución de frecuencias idéntica, antinatural)   |
| **Pseudo-DCT**         | `analyze_image_steganography` | Varianza de diferencias < 10.0 (suavidad antinatural en frecuencias) |

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
   connect-src 'self' ${NEXT_PUBLIC_API_URL} https://*.supabase.co;
   ```
   El `connect-src` es **dinámico**: en desarrollo incluye `localhost:8000`, en producción solo apunta a la URL configurada en `NEXT_PUBLIC_API_URL` (ej: Render).
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

| Método | Endpoint                           | Descripción                                                |
| ------ | ---------------------------------- | ---------------------------------------------------------- |
| `GET`  | `/api/public/albums`               | Lista álbumes aprobados (con cabeceras CSP)                |
| `GET`  | `/api/public/albums/{id}/files`    | Archivos limpios de un álbum público                       |
| `GET`  | `/api/public/albums/{id}/my-files` | Todos los archivos del propietario (signed URLs incluidas) |

### Autenticación (`/api/auth`)

| Método | Endpoint                   | Descripción                               |
| ------ | -------------------------- | ----------------------------------------- |
| `POST` | `/api/auth/register`       | Registro con hash Argon2id (5/min por IP) |
| `GET`  | `/api/auth/role/{user_id}` | Retorna el rol del usuario                |

### Álbumes (`/api/albums`)

| Método | Endpoint                     | Descripción                                      |
| ------ | ---------------------------- | ------------------------------------------------ |
| `GET`  | `/api/albums/my?user_id=...` | Álbumes del usuario autenticado                  |
| `POST` | `/api/albums/request`        | Solicitar nuevo álbum (10/min, sanitización XSS) |
| `GET`  | `/api/albums/{id}`           | Detalle de un álbum por ID                       |

### Archivos (`/api`)

| Método | Endpoint      | Descripción                                                             |
| ------ | ------------- | ----------------------------------------------------------------------- |
| `POST` | `/api/upload` | Subida segura de imágenes y PDFs (Magic Bytes + EXIF + LSB/Chi/DCT/PDF) |

### Supervisor (`/api/supervisor`)

| Método  | Endpoint                                       | Descripción                                                |
| ------- | ---------------------------------------------- | ---------------------------------------------------------- |
| `GET`   | `/api/supervisor/albums?supervisor_id=...`     | Álbumes pendientes de aprobación                           |
| `PATCH` | `/api/supervisor/albums/{id}`                  | Aprobar o rechazar un álbum                                |
| `GET`   | `/api/supervisor/quarantine?supervisor_id=...` | Archivos en cuarentena                                     |
| `PATCH` | `/api/supervisor/quarantine/{id}`              | Aprobar (mover a público) o rechazar (eliminar) un archivo |

### Admin (`/api/admin`)

| Método  | Endpoint                             | Descripción                                      |
| ------- | ------------------------------------ | ------------------------------------------------ |
| `GET`   | `/api/admin/users?supervisor_id=...` | Lista de todos los usuarios con email y username |
| `PATCH` | `/api/admin/users/{id}/role`         | Actualizar rol de un usuario                     |

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
SUPABASE_KEY="tu-service-role-key"    # ⚠️ Usa la service_role key, NO la anon key (copy from Project Settings > API)

# Parámetros de detección de esteganografía (opcionales, con valores por defecto):
LSB_RATIO_MIN=0.499
LSB_RATIO_MAX=0.501
CHI_P_THRESHOLD=0.99
DCT_VAR_THRESHOLD=10.0
```

**Frontend** — crea el archivo `.env.local` dentro de la carpeta `frontend/`:

```bash
# frontend/.env.local
NEXT_PUBLIC_API_URL="http://localhost:8000"
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-public-key"    # Usa la anon/public key
```

**¿Dónde encontrar las claves?**

1. Ve a [supabase.com](https://supabase.com) → inicia sesión en tu proyecto
2. En la barra lateral izquierda: **Project Settings** → **API**
3. Encontrarás:
   - `URL` → cópiala a `SUPABASE_URL`
   - `anon public` → cópiala a `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `service_role secret` → cópiala a `SUPABASE_KEY` (⚠️ guárdala, no la compartas)
   - `JWT Secret` → no se necesita aquí (solo si implementas JWT propio)

> **⚠️ Seguridad:** NUNCA hagas commit de `.env` al repositorio. Está incluido en `.gitignore`.

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
# El archivo requirements.txt incluye python-magic-bin (compatible con Windows)
```

**Verificar instalación:**

```bash
# Comprobar que python-magic-bin está instalado
python -c "import magic; print(magic.__file__)"

# Si falla, instala explícitamente:
pip install python-magic-bin
```

**Iniciar el servidor de desarrollo:**

```bash
uvicorn app.main:app --reload
```

✅ **La API estará disponible en:**

- 🌐 **Base URL:** http://localhost:8000
- 📚 **Swagger (Documentación interactiva):** http://localhost:8000/docs
- 📖 **ReDoc (Documentación alternativa):** http://localhost:8000/redoc

**Verificación rápida:**

```bash
# En otra terminal, prueba la API:
curl http://localhost:8000/docs
# Deberías ver la página de Swagger UI
```

**Notas importantes:**

- El servidor se recarga automáticamente cuando modificas archivos (`--reload`)
- Si quieres ejecutar en producción, remueve `--reload` y usa `gunicorn` o similar
- Los logs mostrarán: `Uvicorn running on http://0.0.0.0:8000`

> **Nota para Windows (desarrollo local)**: Si `python-magic` da error, instala también `python-magic-bin`:
>
> ```bash
> pip install python-magic-bin
> ```
>
> Esta dependencia es **solo para Windows en local**. En producción (Render/Linux) se usa `python-magic` directamente.

---

### Paso 3: Levantar el Frontend (Next.js)

```bash
# Abre una nueva terminal (mantén el backend corriendo en la otra)
cd frontend

# Instalar dependencias
npm install
# O usa yarn/pnpm si lo prefieres: yarn install o pnpm install

# Iniciar el servidor de desarrollo
npm run dev
```

✅ **La aplicación estará disponible en:**

- 🌐 **Galería Frontend:** http://localhost:3000
- 📊 **Dashboard:** http://localhost:3000/dashboard
- 🔐 **Panel Supervisor:** http://localhost:3000/supervisor

**Verificación rápida:**

```bash
# En otra terminal, verifica que el frontend se conecta al backend:
curl http://localhost:3000
# Deberías obtener el HTML de la aplicación
```

**Estructura del frontend:**

```
frontend/
├── src/
│   ├── app/                    # Páginas principales (App Router)
│   ├── components/             # Componentes React reutilizables
│   ├── services/               # Clientes HTTP y lógica de negocio
│   ├── schemas/                # Validación Zod (frontend)
│   └── lib/                    # Utilidades y configuración
├── package.json                # Dependencias Node.js
└── next.config.ts              # Configuración de Next.js y CSP headers
```

**Notas importantes:**

- Asegúrate que el backend está corriendo (http://localhost:8000)
- El frontend usa hot reload automático
- Si hay errores de conexión, verifica `NEXT_PUBLIC_API_URL` en `.env.local`

---

### Paso 4: Datos de Prueba (Opcional)

Para interactuar rápidamente con la aplicación sin crear usuarios manualmente, puedes usar las siguientes credenciales pre-generadas en la base de datos:

**Usuario Demo (Usuario Normal)**

- **Email:** usuario@demo.com
- **Contraseña:** #Usuario123

**Supervisor Demo (Supervisor)**

- **Email:** supervisor@demo.com
- **Contraseña:** #Supervisor123

También puedes ejecutar el siguiente script para generar o regenerar los datos de prueba:

```bash
# Desde la raíz del proyecto (con venv activo)
python create_test_data.py
```

**Este script crea automáticamente:**

- ✅ Un **usuario normal** de prueba (rol: `user`)
- ✅ Un **usuario supervisor** de prueba (rol: `supervisor`)
- ✅ Álbumes de ejemplo
- ✅ Datos para demostración

**Salida esperada:**

```
Creating test data...
✅ User created: test_user@example.com / password123
✅ Supervisor created: supervisor@example.com / password123
✅ Test albums created
✅ Done!
```

**Credenciales de prueba:**

```
Usuario Normal:
- Email: test_user@example.com
- Password: password123
- Rol: user
- Acceso: /dashboard, /albums

Supervisor:
- Email: supervisor@example.com
- Password: password123
- Rol: supervisor
- Acceso: /supervisor, /quarantine, /admin/users
```

**Notas:**

- Puedes ejecutar este script múltiples veces (verifica antes de duplicar)
- Los datos se guardan en la BD de Supabase (no se pierden)
- Para limpiar, accede a Supabase → SQL Editor y ejecuta: `DELETE FROM auth.users;`
- El trigger automático de BD eliminará los perfiles asociados

---

### Paso 5: Scripts de Prueba de Seguridad (Opcional)

Para verificar que el sistema de detección funciona correctamente, disponemos de una suite completa de scripts en la carpeta `scripts/`:

#### 📊 Scripts Disponibles

**Ataques de Esteganografía:**

```bash
# Generar imagen con esteganografía LSB embebida (requiere input.jpg)
python scripts/attack_lsb_image.py
# Salida: lsb_infected.png → debe ir a cuarentena

# Generar PDF con archivo oculto embebido (requiere input.pdf)
python scripts/attack_pdf_embed.py
# Salida: pdf_embedded_payload.pdf → debe ir a cuarentena
```

**Ataques de Estructura PNG:**

```bash
python scripts/generate_invalid_png_crc.py        # PNG con CRC inválido
python scripts/generate_png_trailing_data.py      # PNG con datos tras IEND
python scripts/generate_png_missing_iend.py       # PNG sin chunk IEND
python scripts/generate_fake_png_header.py        # PNG con header incompleto
python scripts/generate_invalid_jpeg_no_sos.py    # JPEG sin marcador SOS
```

**Ataques de Estructura JPEG:**

```bash
python scripts/generate_jpeg_trailing_data.py     # JPEG con datos tras EOI
python scripts/generate_jpeg_missing_eoi.py       # JPEG sin marcador EOI
python scripts/generate_jpeg_with_png_extension.py # JPEG con ext .png
```

**Pruebas de Metadatos:**

```bash
python scripts/generate_exif_gps_jpeg.py          # JPEG con EXIF GPS
# Verificación: el EXIF debe eliminarse después de subida
```

#### 🧪 Flujo de Prueba

1. **Generar el archivo de prueba:**

   ```bash
   python scripts/attack_lsb_image.py     # Genera lsb_infected.png
   ```

2. **Subir a través de la UI:**
   - Accede a http://localhost:3000/dashboard
   - Crea un nuevo álbum o selecciona uno aprobado
   - Sube el archivo generado

3. **Verificar resultado:**
   - El archivo debe marcarse como **sospechoso** (status: "quarantined")
   - Accede como supervisor en http://localhost:3000/supervisor
   - Ve a la pestaña "Cuarentena" para revisar el análisis forense
   - El reporte debe mostrar las técnicas de detección aplicadas

#### 📋 Matriz de Resultados Esperados

| Script                            | Tipo               | Resultado Esperado |
| --------------------------------- | ------------------ | ------------------ |
| `attack_lsb_image.py`             | Esteganografía LSB | ⚠️ Cuarentena      |
| `attack_pdf_embed.py`             | Archivo embebido   | ⚠️ Cuarentena      |
| `generate_invalid_png_crc.py`     | Estructura PNG     | ❌ Rechazo         |
| `generate_invalid_jpeg_no_sos.py` | Estructura JPEG    | ❌ Rechazo         |
| `generate_exif_gps_jpeg.py`       | Metadatos EXIF     | ✅ Limpieza        |

> **Nota:** Ver [scripts/README.md](scripts/README.md) para documentación completa de cada script.

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
>
> - ⚠️ **NUNCA** utilices la `anon_key` en el backend
> - ⚠️ **NUNCA** commits `.env` al repositorio

> **`NEXT_PUBLIC_SUPABASE_ANON_KEY`** del frontend: Es segura para el navegador. Solo puede leer datos según las políticas RLS configuradas.
>
> - ✅ Se puede exponer al cliente (es la `public/anon key`)
> - ✅ Las operaciones están limitadas por RLS en la BD

> **CORS**: En producción, cambia `allow_origins=["*"]` en `app/main.py` por los dominios exactos de tu frontend (ej: `["https://mi-app.vercel.app"]`).
>
> - Configuración actual: permite todo origen (desarrollo)
> - Archivo: [app/main.py](app/main.py#L30)

> **Rate Limiting**: Los límites actuales son para desarrollo. En producción considera ajustar `SlowAPI` a límites más estrictos:
>
> - Registro: 5 peticiones/min por IP
> - Álbumes: 10 peticiones/min por IP
> - Archivo: [app/core/security.py](app/core/security.py)

> **Variables de entorno críticas**:
>
> ```
> SUPABASE_URL=                  # URL del proyecto Supabase
> SUPABASE_KEY=                  # Service Role Key (SECRETO)
> LSB_RATIO_MIN=0.499           # Umbral mínimo LSB (tuneable)
> LSB_RATIO_MAX=0.501           # Umbral máximo LSB (tuneable)
> CHI_P_THRESHOLD=0.99          # Umbral Chi-square (tuneable)
> DCT_VAR_THRESHOLD=10.0        # Umbral DCT (tuneable)
> ```

---

## 🐛 Troubleshooting

### Error: `ModuleNotFoundError: No module named 'magic'`

**Solución:** En Windows, usa `python-magic-bin`:

```bash
pip install python-magic-bin
```

### Error: `RuntimeError: Unable to download file` (Supabase)

**Solución:** Verifica que:

- El archivo existe en el bucket `secure-gallery-images`
- La `service_role_key` tiene permisos de lectura en Storage
- El bucket está en modo público o tienes Signed URLs configuradas

### Error: `CORS policy: No 'Access-Control-Allow-Origin' header`

**Solución:**

- Verifica que el backend está corriendo en `http://localhost:8000`
- El frontend debe estar configurado con `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Asegúrate que el CORS está configurado en [app/main.py](app/main.py)

### Error: `PydanticValidationError` en validación de archivos

**Solución:** Verifica que:

- El archivo no excede 10 MB
- El MIME type es válido (image/jpeg, image/png, application/pdf)
- Los magic bytes coinciden con el contenido real del archivo

### Frontend no se conecta al backend

**Solución:**

- Verifica que ambos servidores están corriendo:
  - Backend: `http://localhost:8000/docs` (Swagger)
  - Frontend: `http://localhost:3000`
- Reinicia ambos servidores
- Limpia el cache del navegador (Ctrl+Shift+Del)

---

## 🚀 Ejecución Rápida (Quick Start)

Si ya configuraste Supabase y las variables de entorno:

```bash
# Terminal 1: Backend
python -m venv venv
venv\Scripts\activate          # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload

# Terminal 2: Frontend
cd frontend
npm install
npm run dev

# Terminal 3: Datos de prueba (opcional)
python create_test_data.py
```

✅ Accede a:

- **Frontend:** http://localhost:3000
- **Backend (API):** http://localhost:8000
- **Swagger (API docs):** http://localhost:8000/docs

---

## 📖 Referencia de Arquitectura

```
┌─────────────────────────────────────────────────────────────────┐
│                    SECURE FRAME GALLERY                          │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ┌──────────────┐           ┌──────────────┐                   │
│  │   Frontend   │           │   Backend    │                   │
│  │ (Next.js)    │◄─HTTP───►│  (FastAPI)   │                   │
│  │ :3000        │           │  :8000       │                   │
│  └──────────────┘           └──────┬───────┘                   │
│       │                             │                           │
│       │                             │                           │
│       └──────────►┌─────────────────┴─────────┐                │
│                   │   SUPABASE (PostgreSQL)   │                │
│                   │   + Storage Bucket        │                │
│                   └─────────────────────────┘                 │
│                                                                  │
│  Security Layers:                                               │
│  ├─ JWT Auth (Supabase Auth)                                   │
│  ├─ RLS (Row Level Security)                                   │
│  ├─ RBAC (Role-Based Access Control)                           │
│  ├─ Rate Limiting (SlowAPI)                                    │
│  ├─ Input Validation (Pydantic + Zod)                          │
│  ├─ XSS Prevention (Bleach)                                    │
│  ├─ Steganography Detection (LSB + Chi-square + DCT)           │
│  └─ CSP Headers (Content-Security-Policy)                      │
│                                                                  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 📚 Recursos Adicionales

- **Supabase Docs:** https://supabase.com/docs
- **FastAPI Docs:** https://fastapi.tiangolo.com
- **Next.js Docs:** https://nextjs.org/docs
- **OWASP Top 10:** https://owasp.org/www-project-top-ten/
- **Steganography Research:** Papers en IEEE Xplore sobre LSB embedding detection

---

_Proyecto desarrollado para el curso de **Desarrollo Seguro** — Implementación de una galería multimedia con análisis forense integrado y detección de esteganografía._

**Integrantes:**

- Christian Marcelo Acuña Gamboa
- Abner David Arboleda Roman
- Christian Mateo Bonifaz Vásquez

**Docente:** Ing. Angel Cudco

**Fecha:** 8 de Mayo del 2026

---

## 📋 Requisitos del Sistema (`requirements.txt`)

El backend requiere las siguientes dependencias principales de Python:

```
fastapi
uvicorn[standard]
python-dotenv
supabase==2.25.0
passlib[argon2]
bleach
slowapi
python-magic-bin                # Validación de MIME types por magic bytes
python-magic          # usa python-magic-bin en Windows local
filetype
pillow
numpy
scipy
pymupdf                          # Análisis de PDFs
python-multipart
```

> **Windows:** Si tienes problemas con `python-magic`, asegúrate de usar `python-magic-bin` (está en requirements.txt). No se requiere instalar herramientas externas adicionales.

---

## 📚 Documentación de Seguridad

Este proyecto incluye análisis detallados de seguridad alineados con los requisitos de la asignatura (RF01 - RF05):

### 📄 Documentos Disponibles

| Documento                       | Contenido                                                                                    | Ubicación                                                  |
| ------------------------------- | -------------------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **SECURITY_ANALYSIS.md**        | Análisis exhaustivo de técnicas de detección esteganográfica (LSB, Chi-cuadrado, Pseudo-DCT) | [SECURITY_ANALYSIS.md](SECURITY_ANALYSIS.md)               |
| **SECURITY_QUICK_REFERENCE.md** | Guía rápida de controles de seguridad y matriz OWASP                                         | [SECURITY_QUICK_REFERENCE.md](SECURITY_QUICK_REFERENCE.md) |
| **analysis_RF01.md**            | Análisis detallado: Autenticación y RBAC                                                     | [analysis_RF01.md](analysis_RF01.md)                       |
| **analysis_RF02.md**            | Análisis detallado: Prevención de inyecciones (SQLi, XSS)                                    | [analysis_RF02.md](analysis_RF02.md)                       |
| **analysis_RF03.md**            | Análisis detallado: Validación de archivos y MIME types                                      | [analysis_RF03.md](analysis_RF03.md)                       |
| **analysis_RF04.md**            | Análisis detallado: Detección de esteganografía y cuarentena                                 | [analysis_RF04.md](analysis_RF04.md)                       |
| **analysis_RF05.md**            | Análisis detallado: Seguridad perimetral y cabeceras HTTP                                    | [analysis_RF05.md](analysis_RF05.md)                       |
| **doc.md**                      | Documento integrador: Plan estratégico de seguridad                                          | [doc.md](doc.md)                                           |
| **formato.md**                  | Especificación de formatos de respuesta de API                                               | [formato.md](formato.md)                                   |

### 🔍 Técnicas de Detección Implementadas

El motor de análisis de archivos implementa **tres técnicas complementarias** para imágenes:

1. **Análisis de Bit LSB (Least Significant Bit)**
   - Detecta alteraciones artificiales en el bit menos significativo
   - Umbral: `0.499 < ratio_ones < 0.501`
   - Mitigación de falsos positivos mediante rangos estrictos

2. **Ataque Chi-Cuadrado (Pairs of Values - PoV)**
   - Análisis estadístico de distribución de frecuencias
   - Detecta regularidad artificial: `p-value > 0.99`
   - Identifica patrones imposibles en imágenes naturales

3. **Pseudo-DCT (Varianza de Diferencias)**
   - Análisis de suavidad espacial
   - Detecta imágenes artificialmente suaves: `varianza < 10.0`
   - Identifica compresión o alteración de frecuencias

**Para PDFs:**

- Detección de JavaScript embebido
- Identificación de widgets con scripts
- Búsqueda de archivos ocultos
- Validación de encriptación

→ **Flujo de decisión:** Si alguna técnica detecta sospecha → archivo a cuarentena para revisión del supervisor

---

## ☁️ Guía de Despliegue (Producción)

### Backend (Render / VPS)

1. **Dependencias de Sistema**: Es necesario asegurar que la librería C subyacente para `python-magic` esté instalada. En Linux (Render) esto normalmente es `libmagic1`. En tu `render.yaml` debes incluir la instalación de paquetes del sistema si usas el entorno nativo (ej. `apt-get install libmagic1`), o desplegar vía Docker (`Dockerfile` instalando `libmagic1`).
2. **Variables de Entorno Necesarias**:
   - `SUPABASE_URL`: URL del proyecto de Supabase.
   - `SUPABASE_KEY`: Service role key de Supabase (nunca exponer en el frontend).
3. **CORS**: Asegurar que en producción solo se permita el origen del frontend (ej. configurando en la lista blanca `https://tu-frontend.vercel.app`).
4. **Comando de inicio**: `uvicorn app.main:app --host 0.0.0.0 --port 10000`

### Frontend (Vercel)

1. Conectar el repositorio de GitHub a Vercel y configurar el directorio raíz como `frontend`.
2. **Variables de Entorno Necesarias**:
   - `NEXT_PUBLIC_API_URL`: URL del backend en producción (ej. `https://tu-backend.onrender.com`).
   - `NEXT_PUBLIC_SUPABASE_URL`: URL del proyecto de Supabase.
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Llave anónima pública de Supabase.
3. El `next.config.ts` se encargará de ajustar el Content Security Policy (CSP) dinámicamente usando la variable `NEXT_PUBLIC_API_URL`.

---

## 🧠 Justificación técnica de la librería/método elegido para la detección de esteganografía

La detección de esteganografía en el proyecto se realiza mediante una combinación de **Análisis Espacial LSB**, **Prueba Estadística Chi-Cuadrado** y análisis **Pseudo-DCT**. Para implementar estos métodos matemáticos de manera eficiente y segura contra ataques de denegación de servicio (DoS) a nivel de procesamiento, se seleccionaron las librerías **NumPy** y **SciPy**.

**Justificación de los métodos elegidos:**

- **LSB Espacial (Least Significant Bit):** Es el método más común de esteganografía. Se detecta analizando la entropía o la distribución de 0s y 1s en el bit menos significativo de cada píxel. En imágenes naturales, esta distribución suele estar desbalanceada (dependiendo de la iluminación y los colores). Si hay esteganografía, los bits insertados (que suelen estar encriptados o comprimidos) parecen pseudoaleatorios, llevando el ratio de 1s casi exactamente al 50%.
- **Chi-Cuadrado (PoV - Pairs of Values):** Analiza la frecuencia de pares de colores (PoV) adyacentes. En imágenes naturales, las frecuencias de valores pares e impares (ej. 2 y 3, 4 y 5) varían ampliamente. La inserción esteganográfica en LSB tiende a igualar estas frecuencias con el tiempo. El ataque Chi-Cuadrado mide matemáticamente esta igualdad antinatural para detectar modificaciones.

**Justificación de las librerías elegidas:**

- **NumPy:** Permite extraer el plano de bits menos significativo (LSB) de una imagen de forma 100% vectorizada. En lugar de iterar píxel por píxel con bucles `for` nativos de Python (lo cual sería ineficiente, consumiría exceso de memoria, y sería vector de ataque DoS), NumPy aplica operaciones a nivel C subyacente sobre toda la matriz de la imagen instantáneamente.
- **SciPy (`scipy.stats.chisquare`):** Proporciona implementaciones robustas y optimizadas matemáticamente para realizar la prueba estadística de bondad de ajuste (Chi-Cuadrado). Escribir la fórmula estadística desde cero introduciría altos riesgos de errores en la implementación y no estaría optimizado a bajo nivel, lo cual podría crear cuellos de botella en la API. SciPy maneja estas distribuciones de probabilidad de forma nativa.
