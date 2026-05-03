# RF05 - Visualizacion Publica Segura

## Cumple
- Visitantes pueden ver albumes aprobados y archivos limpios. Ver [app/api/routes/public.py](app/api/routes/public.py#L30) y [frontend/src/app/page.tsx](frontend/src/app/page.tsx#L1).
- Headers de seguridad en endpoints publicos: `Content-Security-Policy` y `X-Content-Type-Options: nosniff`. Ver [app/api/routes/public.py](app/api/routes/public.py#L6).
- CSP y `nosniff` tambien se aplican en Next.js para toda la app. Ver [frontend/next.config.ts](frontend/next.config.ts#L1).

## Falta / Riesgo
### Medio
- La CSP en FastAPI es muy restrictiva (`script-src 'none'`) y solo aplica a endpoints JSON; no protege la app de Next.js (la cual tiene CSP propia). Esto no rompe RF05, pero la coherencia entre CSPs es parcial.
- `allow_origins` en CORS esta configurado en `*`, lo cual es permisivo para un entorno de produccion. Ver [app/main.py](app/main.py#L11).

### Bajo
- La CSP en Next.js permite `'unsafe-inline'` y `'unsafe-eval'` para scripts, lo cual reduce la proteccion contra XSS en produccion. Ver [frontend/next.config.ts](frontend/next.config.ts#L1).

## Notas
- El bloqueo de SVG malicioso depende de no permitir `image/svg+xml` en upload y de `nosniff`. La validacion de MIME en upload ya lo impide. Ver [app/api/routes/files.py](app/api/routes/files.py#L44).
