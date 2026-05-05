# RF02 - Gestion de Albumes (Solicitud y Aprobacion)

## Cumple
- El usuario puede solicitar un album con titulo, descripcion y privacidad. Se guarda con estado `pending`. Ver [app/api/routes/albums.py](app/api/routes/albums.py#L1).
- El supervisor puede ver albumes pendientes y aprobar o rechazar. Ver [app/api/routes/supervisor.py](app/api/routes/supervisor.py#L1).
- Validacion de campos en frontend con Zod (longitud y privacidad). Ver [frontend/src/schemas/album.schema.ts](frontend/src/schemas/album.schema.ts#L1).
- Sanitizacion XSS con `bleach.clean` en backend para titulo y descripcion. Ver [app/api/routes/albums.py](app/api/routes/albums.py#L12).
- Estado por defecto `pending` y columna `privacy` definida en la BD. Ver [database.sql](database.sql#L29).

## Falta / Riesgo
### Alto
- (Resuelto) El backend ahora valida el JWT y usa el `user_id` del token. Ver [app/api/routes/albums.py](app/api/routes/albums.py#L1).

### Medio
- (Resuelto) Backend valida longitud y privacidad en `AlbumCreate`. Ver [app/models/schemas.py](app/models/schemas.py#L16).

- (Resuelto) El endpoint de supervisor valida que el album este en estado `pending` antes de aprobar/rechazar. Ver [app/api/routes/supervisor.py](app/api/routes/supervisor.py#L20).

### Bajo
- (Resuelto) Se registra auditoria de decisiones en `decision_audit` al aprobar/rechazar. Ver [app/api/routes/supervisor.py](app/api/routes/supervisor.py#L6) y [database.sql](database.sql#L49).

## Notas
- RLS en BD existe para `albums`, pero si el backend usa `service_role`, RLS no aplica. Ver [database.sql](database.sql#L82).
