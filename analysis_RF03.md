# RF03 - Subida de Imagenes y Deteccion de Esteganografia

## Cumple
- Solo permite subir a album aprobado y del propietario. Ver [app/api/routes/files.py](app/api/routes/files.py#L33).
- Validacion de tipo real por magic bytes (python-magic o fallback). Ver [app/api/routes/files.py](app/api/routes/files.py#L44).
- Re-encoding y stripping de EXIF antes del analisis (imagenes). Ver [app/api/routes/files.py](app/api/routes/files.py#L60) y [app/services/file_analysis.py](app/services/file_analysis.py#L94).
- Analisis esteganografico automatizado: LSB ratio, chi-cuadrado y proxy DCT. Ver [app/services/file_analysis.py](app/services/file_analysis.py#L1).
- Analisis estructural basico de JPEG/PNG (SOI/EOI, PNG chunks, bytes extra tras EOF). Ver [app/services/file_analysis.py](app/services/file_analysis.py#L49).
- Si es sospechoso: cuarentena; si es limpio: uploads. Ver [app/api/routes/files.py](app/api/routes/files.py#L78).

## Falta / Riesgo
### Alto
- (Resuelto) La subida valida JWT y usa el `user_id` del token. Ver [app/api/routes/files.py](app/api/routes/files.py#L1).

### Medio
- (Resuelto) El analisis estructural ahora valida marcadores JPEG internos y CRC de chunks PNG. Ver [app/services/file_analysis.py](app/services/file_analysis.py#L44).

- (Resuelto) Los umbrales LSB/chi/DCT son configurables por variables de entorno. Ver [app/services/file_analysis.py](app/services/file_analysis.py#L1) y [app/core/config.py](app/core/config.py#L1).

### Bajo
- El flujo guarda PNG re-encodeado incluso si el input es JPEG; esto altera el archivo original. Puede ser aceptable, pero no se documenta en el requisito.

## Notas
- El flujo para PDFs tambien existe, pero RF03 se centra en imagenes. Ver [app/services/file_analysis.py](app/services/file_analysis.py#L73).
