## 🛡️ SecureFrame Gallery — Software Seguro

**SecureFrame Gallery** es un proyecto integrador enfocado en el _"Desarrollo Seguro de una galería multimedia pública con detección de esteganografía y gestión de riesgos en el SDLC"_.

Este repositorio implementa una solución _Full-Stack_ (FastAPI + Next.js + Supabase) que no solo provee una plataforma estética y funcional, sino que está diseñada bajo estrictos principios de **Security by Design** y **Clean Architecture**, mitigando amenazas que van desde ataques XSS hasta vectores avanzados como la exfiltración de datos vía **Esteganografía LSB**.

---

## 📑 Tabla de Contenidos

1. [Ejecución Rápida (Quick Start)](#🚀-ejecución-rápida-quick-start)
2. [Arquitectura y Tecnologías](#🏗️-arquitectura-y-tecnologías)
3. [Estructura del Proyecto](#📁-estructura-del-proyecto)
4. [Requisitos de Seguridad (RF01-RF05)](#🎯-cumplimiento-de-requisitos-de-seguridad-rf01---rf05)
5. [Detección de Esteganografía](#🧠-justificación-técnica-de-la-libreríamétodo-elegido-para-la-detección-de-esteganografía)
6. [API Endpoints](#🔌-api-endpoints)
7. [Guía de Instalación Local](#🚀-guía-de-instalación-y-ejecución-local)
8. [Pruebas y Seguridad](#paso-5-scripts-de-prueba-de-seguridad-opcional)
9. [Despliegue](#☁️-guía-de-despliegue-producción)
10. [Troubleshooting](#🐛-troubleshooting)

---

## 🚀 Ejecución Rápida (Quick Start)

### 1. Configuración de Variables de Entorno

Crea los archivos de configuración para conectar el sistema con Supabase:

**Backend (`.env` en la raíz):**
```bash
SUPABASE_URL="https://tu-proyecto.supabase.co"
SUPABASE_KEY="tu-anon-key"
SUPABASE_SERVICE_ROLE_KEY="tu-service-role-key"

# Opcionales (Análisis Forense):
LSB_RATIO_MIN=0.498
LSB_RATIO_MAX=0.502
CHI_P_THRESHOLD=0.995
DCT_VARIANCE_THRESHOLD=8.0
CORS_ALLOW_ORIGINS=http://localhost:3000
```

**Frontend (`frontend/.env.local`):**
```bash
NEXT_PUBLIC_API_URL="http://localhost:8000"
NEXT_PUBLIC_SUPABASE_URL="https://tu-proyecto.supabase.co"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu-anon-key"  # Anon public key para el cliente
```

### 2. Levantar el Proyecto

Sigue estos pasos para levantar el proyecto en 1 minuto:

```bash
# Terminal 1: Backend
python -m venv venv
source venv/bin/activate       # Windows: venv\Scripts\activate
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
- **API Docs:** http://localhost:8000/docs

---

## 🏗️ Arquitectura y Tecnologías

El proyecto utiliza un stack moderno y seguro, elegido estratégicamente para mitigar los riesgos definidos en el SDLC:

- **FastAPI (Backend):** Elegido por su soporte asíncrono nativo (ideal para tareas de análisis forense pesadas) y su integración con Pydantic, que garantiza una validación estricta de todos los datos de entrada, previniendo inyecciones y desbordamientos desde el primer nivel.
- **Next.js (Frontend):** Provee una arquitectura basada en componentes con Server-Side Rendering (SSR). Esto permite manejar la seguridad de manera centralizada en el servidor (como la generación de cabeceras CSP dinámicas y la gestión segura de tokens JWT) antes de renderizar el cliente.
- **Supabase (BaaS):** Actúa como nuestra capa de persistencia y seguridad de datos. Gracias a **PostgreSQL con Row Level Security (RLS)**, aseguramos que el aislamiento de datos sea forzado a nivel de base de datos, no solo en la lógica de la aplicación.

El proyecto está rigurosamente separado en dos componentes principales:

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

## 🎯 Cumplimiento de Requisitos de Seguridad (RF01 - RF05)

### ✅ RF01: Autenticación Segura y Control de Acceso (RBAC)
- **Argon2id**: Implementado vía `passlib[argon2]`, garantizando el hasheo de contraseñas con salado dinámico resistente a ataques de GPU.
- **Rate Limiting**: Utiliza `SlowAPI` para limitar a 5 peticiones/min el registro, mitigando ataques de fuerza bruta y enumeración.
- **RBAC**: Control de acceso basado en roles (`user`, `supervisor`) verificado tanto en el frontend (redirecciones) como en cada endpoint del backend.

### ✅ RF02: Prevención de Inyecciones (SQLi y XSS)
- **SQLi**: Mitigado mediante el uso exclusivo de queries parametrizadas a través del cliente de Supabase (PostgreSQL).
- **XSS**: Doble capa de protección:
  - **Backend**: Sanitización con la librería `bleach` para eliminar cualquier etiqueta maliciosa (`<script>`, `<iframe>`) en títulos y descripciones.
  - **Frontend**: Validación estricta con esquemas de **Zod** y manejo de DOM seguro por React.

### ✅ RF03: Validación Profunda de Archivos
- **MIME Validation**: No se confía en la extensión del archivo; se analizan los **Magic Bytes** usando `python-magic`.
- **EXIF Stripping**: Se reconstruyen las imágenes en memoria eliminando metadatos sensibles (GPS, modelo de cámara) que podrían ser usados para rastreo.
- **Límite de Tamaño**: Restricción de 10MB por archivo para prevenir ataques de agotamiento de recursos.

### ✅ RF04: Defensa en Profundidad (Análisis de Esteganografía)
- **Aislamiento**: Los archivos sospechosos se mueven automáticamente a un bucket de **Cuarentena**.
- **Acceso Temporal**: Los supervisores revisan archivos mediante **Signed URLs** de corta duración (60s), minimizando la exposición.

### ✅ RF05: Seguridad Perimetral y Cabeceras
- **CSP (Content Security Policy)**: Configurada dinámicamente en Next.js para bloquear la ejecución de scripts no autorizados y conexiones a dominios externos no verificados.
- **Security Headers**: `X-Content-Type-Options: nosniff` y `X-Frame-Options: DENY` aplicados globalmente.

---

## 🧠 Justificación técnica de la detección de esteganografía

El motor de análisis forense implementa tres técnicas matemáticas complementarias para identificar anomalías en imágenes:

| Técnica | Función | Criterio de Sospecha |
| --- | --- | --- |
| **Análisis LSB** | Detecta alteraciones en el bit menos significativo | Ratio de bits-1 cercano al 0.5 (entropía artificial) |
| **Chi-Cuadrado** | Análisis estadístico de pares de valores (PoV) | p-value > 0.99 (distribución de frecuencias antinatural) |
| **Pseudo-DCT** | Análisis de suavidad en el dominio de frecuencia | Varianza < 10.0 (pérdida de ruido natural por inserción) |

**Para PDFs**, se detectan:
- JavaScript embebido en enlaces y widgets.
- Archivos ocultos (`EmbeddedFiles`).
- Estructuras malformadas que intentan evadir filtros.

**Librerías Elegidas:**
- **NumPy**: Permite la extracción de planos de bits de forma **vectorizada**, lo cual es órdenes de magnitud más rápido que bucles tradicionales y previene ataques DoS por CPU.
- **SciPy**: Proporciona implementaciones estadísticas probadas para el cálculo de Chi-Cuadrado, garantizando precisión matemática sin errores de implementación manual.

---

## 🔌 API Endpoints

| Método | Endpoint | Descripción |
| --- | --- | --- |
| `POST` | `/api/auth/register` | Registro con Argon2id |
| `POST` | `/api/upload` | Subida segura con análisis forense |
| `GET` | `/api/public/albums` | Lista de álbumes aprobados |
| `PATCH` | `/api/supervisor/albums/{id}` | Aprobación de álbumes |
| `PATCH` | `/api/supervisor/quarantine/{id}` | Decisión sobre archivos en cuarentena |

---

## 🛠️ Guía de Instalación y Ejecución Local

### Paso 1: Configurar Supabase
1. Ejecuta `database.sql` en el SQL Editor de Supabase.
2. Crea un bucket llamado `secure-gallery-images`.

### Paso 2: Variables de Entorno
**Backend (`.env`):**
```bash
SUPABASE_URL="tu_url"
SUPABASE_KEY="tu_service_role_key"
```

**Frontend (`frontend/.env.local`):**
```bash
NEXT_PUBLIC_API_URL="http://localhost:8000"
NEXT_PUBLIC_SUPABASE_URL="tu_url"
NEXT_PUBLIC_SUPABASE_ANON_KEY="tu_anon_key"
```

### Paso 3: Levantar servicios
```bash
# Backend
pip install -r requirements.txt
uvicorn app.main:app --reload

# Frontend
cd frontend && npm install && npm run dev
```

---

## 🧪 Datos y Scripts de Prueba

### 👥 Credenciales de Prueba (Demo)

Para interactuar con el sistema sin registros manuales:

| Rol | Email | Password |
| --- | --- | --- |
| **Usuario** | `usuario@demo.com` | `#Usuario123` |
| **Supervisor** | `supervisor@demo.com` | `#Supervisor123` |

### 🛠️ Scripts de Ataque (Carpeta `scripts/`)

Contamos con herramientas para verificar la robustez del sistema:

1. **`attack_lsb_image.py`**: Inserta un mensaje oculto en una imagen usando LSB. Al subirla, el sistema **debe** detectarla y enviarla a cuarentena.
2. **`attack_pdf_embed.py`**: Genera un PDF con scripts maliciosos o archivos embebidos.
3. **`generate_invalid_png_crc.py`**: Crea imágenes con errores estructurales para probar el rechazo de archivos corruptos.
4. **`generate_exif_gps_jpeg.py`**: Crea una imagen con datos de ubicación GPS para verificar el proceso de limpieza (stripping).

---

## ☁️ Guía de Despliegue (Producción)

### Backend (Render / VPS)
- Asegurar instalación de `libmagic1`.
- Configurar variables de entorno y CORS para el dominio de producción.

### Frontend (Vercel)
- Configurar variables de entorno apuntando a la URL del backend en producción.

---

## 🐛 Troubleshooting
- **Error `magic`**: Instala `python-magic-bin` en Windows.
- **Error CORS**: Verifica que la URL del backend en el frontend coincida con la real.

---

_Proyecto desarrollado para el curso de **Desarrollo Seguro** — 2026._
**Integrantes:** Christian Acuña, Abner Arboleda, Christian Bonifaz.
**Docente:** Ing. Angel Cudco.
