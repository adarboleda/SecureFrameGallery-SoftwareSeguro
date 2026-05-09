# 🚀 Guía de Despliegue: Backend en Render + Frontend en Vercel

## Prerequisito: El repositorio debe estar en GitHub
Asegúrate de que el código esté subido a GitHub (rama `main` o `master`).

---

## PARTE 1 — Preparar el Backend para Render

### Paso 1.1 — Crear `render.yaml` (opcional pero recomendado)
Crea el archivo en la raíz del proyecto:

```yaml
# render.yaml
services:
  - type: web
    name: secureframe-gallery-api
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn app.main:app --host 0.0.0.0 --port $PORT
    envVars:
      - key: PYTHON_VERSION
        value: 3.11.0
```

### Paso 1.2 — Verificar que `python-magic-bin` funcione en Linux
`python-magic-bin` es solo para Windows. En Linux (Render usa Ubuntu), se necesita `python-magic` + la librería del sistema. Actualiza `requirements.txt`:

```diff
- python-magic-bin
+ python-magic
```

Y agrega al `render.yaml` en `buildCommand`:
```
apt-get install -y libmagic1 && pip install -r requirements.txt
```

O en el dashboard de Render puedes usar el campo **Build Command** directamente (ver Paso 2.3).

### Paso 1.3 — Hacer commit y push

```bash
git add render.yaml requirements.txt
git commit -m "chore: prepare backend for Render deployment"
git push
```

---

## PARTE 2 — Desplegar el Backend en Render

### Paso 2.1 — Crear cuenta en Render
Ve a [https://render.com](https://render.com) → **Get Started for Free** → conecta con tu cuenta de GitHub.

### Paso 2.2 — Crear nuevo Web Service
1. Dashboard → clic en **New +** → **Web Service**
2. Selecciona el repositorio `SecureFrameGallery-SoftwareSeguro`
3. Clic en **Connect**

### Paso 2.3 — Configurar el servicio

| Campo | Valor |
|-------|-------|
| **Name** | `secureframe-api` (o el que prefieras) |
| **Region** | `Oregon (US West)` u otra de tu preferencia |
| **Branch** | `main` |
| **Runtime** | `Python 3` |
| **Build Command** | `apt-get install -y libmagic1 && pip install -r requirements.txt` |
| **Start Command** | `uvicorn app.main:app --host 0.0.0.0 --port $PORT` |
| **Instance Type** | `Free` (para pruebas) |

### Paso 2.4 — Agregar Variables de Entorno
En la sección **Environment Variables** del servicio, agrega **una por una**:

| Key | Value |
|-----|-------|
| `SUPABASE_URL` | `https://srsowmrhaqptfotphfrz.supabase.co` |
| `SUPABASE_KEY` | `eyJhbGciOi...` (tu anon key) |
| `SUPABASE_SERVICE_ROLE_KEY` | `eyJhbGciOi...` (tu service role key) |
| `LSB_RATIO_MIN` | `0.498` |
| `LSB_RATIO_MAX` | `0.502` |
| `CHI_P_THRESHOLD` | `0.995` |
| `DCT_VARIANCE_THRESHOLD` | `8.0` |
| `CORS_ALLOW_ORIGINS` | *(dejar en blanco por ahora — se actualizará con la URL de Vercel en el Paso 4)* |

> [!IMPORTANT]
> `CORS_ALLOW_ORIGINS` se configura DESPUÉS de obtener la URL de Vercel. Por ahora ponle un valor temporal como `http://localhost:3000`.

### Paso 2.5 — Deploy
Clic en **Create Web Service**. Render comenzará el build automáticamente.

Espera ~3-5 minutos. Cuando el status sea **Live**, verás tu URL de backend, algo como:
```
https://secureframe-api.onrender.com
```

> [!NOTE]
> En el plan Free, el servicio "duerme" tras 15 min de inactividad. El primer request puede tardar ~30s en "despertar".

---

## PARTE 3 — Preparar el Frontend para Vercel

### Paso 3.1 — Verificar `next.config.ts`
Asegúrate de que no tenga rutas hardcodeadas a `localhost`. Ábrelo y verifica que use variables de entorno.

### Paso 3.2 — NO subir `.env.local` a GitHub
El `.gitignore` ya lo excluye ✅. Las variables se configurarán directo en Vercel.

---

## PARTE 4 — Desplegar el Frontend en Vercel

### Paso 4.1 — Crear cuenta en Vercel
Ve a [https://vercel.com](https://vercel.com) → **Start Deploying** → conecta con GitHub.

### Paso 4.2 — Importar proyecto
1. Dashboard → **Add New...** → **Project**
2. Busca y selecciona `SecureFrameGallery-SoftwareSeguro`
3. Clic en **Import**

### Paso 4.3 — Configurar el proyecto

| Campo | Valor |
|-------|-------|
| **Framework Preset** | `Next.js` (detectado automáticamente) |
| **Root Directory** | `frontend` ← **MUY IMPORTANTE** |
| **Build Command** | `npm run build` (por defecto) |
| **Output Directory** | `.next` (por defecto) |
| **Install Command** | `npm install` (por defecto) |

> [!IMPORTANT]
> El **Root Directory** DEBE ser `frontend` porque tu proyecto Next.js está en esa subcarpeta, no en la raíz del repo.

### Paso 4.4 — Agregar Variables de Entorno
En la sección **Environment Variables**:

| Key | Value |
|-----|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://srsowmrhaqptfotphfrz.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGciOi...` (tu anon key) |
| `NEXT_PUBLIC_API_URL` | `https://secureframe-api.onrender.com` ← la URL de Render del Paso 2.5 |

### Paso 4.5 — Deploy
Clic en **Deploy**. Espera ~2-3 minutos.

Cuando termine, obtendrás una URL como:
```
https://secure-frame-gallery.vercel.app
```

---

## PARTE 5 — Conectar ambos servicios (CORS)

### Paso 5.1 — Actualizar CORS en Render
Ahora que tienes la URL de Vercel:

1. Ve a Render → tu servicio → **Environment**
2. Edita `CORS_ALLOW_ORIGINS`:
   ```
   https://secure-frame-gallery.vercel.app
   ```
   Si tienes múltiples dominios (ej. el dominio custom de Vercel también), separa con coma:
   ```
   https://secure-frame-gallery.vercel.app,https://tu-dominio-custom.com
   ```
3. Clic en **Save Changes** → Render redesplegará automáticamente.

### Paso 5.2 — Verificar el despliegue completo
1. Abre la URL de Vercel en el browser
2. Intenta hacer login o acceder a recursos protegidos
3. Verifica en las DevTools (F12 → Network) que las requests van a `https://secureframe-api.onrender.com`

---

## Resumen de URLs finales

| Servicio | URL |
|----------|-----|
| **Backend (Render)** | `https://secureframe-api.onrender.com` |
| **Frontend (Vercel)** | `https://secure-frame-gallery.vercel.app` |
| **Supabase** | `https://srsowmrhaqptfotphfrz.supabase.co` |

---

## Troubleshooting común

| Problema | Solución |
|----------|----------|
| `ModuleNotFoundError: magic` | Asegúrate de usar `python-magic` (no `python-magic-bin`) y que el build command incluya `apt-get install -y libmagic1` |
| Error CORS en el browser | Verifica que `CORS_ALLOW_ORIGINS` en Render tenga exactamente la URL de Vercel (sin trailing slash) |
| Frontend no llega al backend | Verifica que `NEXT_PUBLIC_API_URL` en Vercel apunte a la URL correcta de Render |
| Backend "sleeping" (plan free) | Normal en Render Free. El primer request tras inactividad tarda ~30s |
| Build falla en Vercel | Confirma que **Root Directory** esté configurado como `frontend` |
