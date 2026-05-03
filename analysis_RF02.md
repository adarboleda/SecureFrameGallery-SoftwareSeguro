# RF02 - Gestion de Albumes (Solicitud y Aprobacion)

## Cumple
- El usuario puede solicitar un album con titulo, descripcion y privacidad. Se guarda con estado `pending`. Ver [app/api/routes/albums.py](app/api/routes/albums.py#L1).
- El supervisor puede ver albumes pendientes y aprobar o rechazar. Ver [app/api/routes/supervisor.py](app/api/routes/supervisor.py#L1).
- Validacion de campos en frontend con Zod (longitud y privacidad). Ver [frontend/src/schemas/album.schema.ts](frontend/src/schemas/album.schema.ts#L1).
- Sanitizacion XSS con `bleach.clean` en backend para titulo y descripcion. Ver [app/api/routes/albums.py](app/api/routes/albums.py#L12).
- Estado por defecto `pending` y columna `privacy` definida en la BD. Ver [database.sql](database.sql#L29).

## Falta / Riesgo
### Alto
- El backend confia en `user_id` enviado por el cliente sin validacion de sesion/JWT. Un usuario podria solicitar albumes a nombre de otro. Ver [app/api/routes/albums.py](app/api/routes/albums.py#L15).

### Medio
- No hay validacion de longitud/formato en backend para `title/description/privacy` mas alla de `bleach`. Si el frontend se salta, pueden entrar datos fuera de rango. Ver [app/models/schemas.py](app/models/schemas.py#L16) y [app/api/routes/albums.py](app/api/routes/albums.py#L15).
- El endpoint de supervisor no verifica que el album este en estado `pending` antes de aprobar/rechazar. Podria cambiar estados arbitrariamente. Ver [app/api/routes/supervisor.py](app/api/routes/supervisor.py#L15).

### Bajo
- El flujo no registra auditoria de decisiones (quien aprobo/rechazo, fecha) en una tabla o logs persistentes.

## Notas
- RLS en BD existe para `albums`, pero si el backend usa `service_role`, RLS no aplica. Ver [database.sql](database.sql#L82).
