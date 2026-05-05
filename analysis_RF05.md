# RF05 - Visualizacion Publica Segura

## Cumple
- Visitantes pueden ver albumes aprobados y archivos limpios. Ver [app/api/routes/public.py](app/api/routes/public.py#L30) y [frontend/src/app/page.tsx](frontend/src/app/page.tsx#L1).
- Headers de seguridad en endpoints publicos: `Content-Security-Policy` y `X-Content-Type-Options: nosniff`. Ver [app/api/routes/public.py](app/api/routes/public.py#L6).
- CSP y `nosniff` tambien se aplican en Next.js para toda la app. Ver [frontend/next.config.ts](frontend/next.config.ts#L1).

## Falta / Riesgo
### Medio
- (Aceptado) La CSP en FastAPI aplica solo a endpoints JSON; la CSP efectiva para la UI es la de Next.js. Se documenta como separacion de responsabilidades.
- (Resuelto) CORS usa una lista configurada por entorno en `CORS_ALLOW_ORIGINS`. Ver [app/main.py](app/main.py#L12).

### Bajo
- (Mitigado) Se elimina `'unsafe-eval'` en produccion y se mantiene `'unsafe-inline'` por limitacion de CSP estatica en Next.js. Ver [frontend/next.config.ts](frontend/next.config.ts#L1).

## Notas
- El bloqueo de SVG malicioso depende de no permitir `image/svg+xml` en upload y de `nosniff`. La validacion de MIME en upload ya lo impide. Ver [app/api/routes/files.py](app/api/routes/files.py#L44).
