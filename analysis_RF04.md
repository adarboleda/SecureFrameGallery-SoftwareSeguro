# RF04 - Flujo de Revision Manual (Supervisor)

## Cumple
- Existe bandeja de cuarentena para supervisor con listado de archivos `quarantined`. Ver [app/api/routes/supervisor.py](app/api/routes/supervisor.py#L26) y [frontend/src/app/supervisor/page.tsx](frontend/src/app/supervisor/page.tsx#L140).
- El supervisor puede aprobar o rechazar archivos; el backend mueve o elimina en Storage y actualiza estado. Ver [app/api/routes/supervisor.py](app/api/routes/supervisor.py#L40).
- La UI permite ver el archivo (imagen/PDF) desde URL firmada. Ver [frontend/src/services/file.service.ts](frontend/src/services/file.service.ts#L14) y [frontend/src/app/supervisor/page.tsx](frontend/src/app/supervisor/page.tsx#L240).

## Falta / Riesgo
### Alto
- (Resuelto) Los endpoints de cuarentena validan JWT y usan el `supervisor_id` del token. Ver [app/api/routes/supervisor.py](app/api/routes/supervisor.py#L1).

### Medio
- (Resuelto) La vista de supervisor muestra motivo resumido y el detalle de analisis esta en `/quarantine`. Ver [frontend/src/app/supervisor/page.tsx](frontend/src/app/supervisor/page.tsx#L220) y [frontend/src/app/quarantine/page.tsx](frontend/src/app/quarantine/page.tsx#L1).
- (Resuelto) Se registra auditoria de decisiones con motivo en `decision_audit`. Ver [app/api/routes/supervisor.py](app/api/routes/supervisor.py#L7) y [database.sql](database.sql#L47).

### Bajo
- No hay paginacion/filtros en la lista de cuarentena; puede degradar la UX con muchos archivos.

## Notas
- El endpoint devuelve `analysis_metadata` pero la UI no lo consume. Se podria usar en la vista `/quarantine?fileId=...` si existe.
