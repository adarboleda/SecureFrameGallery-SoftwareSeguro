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
- La ruta de subida recibe `user_id` desde el cliente sin validacion de sesion/JWT. Un atacante podria subir a album de otro si conoce IDs (aunque se valida album_id+user_id). Ver [app/api/routes/files.py](app/api/routes/files.py#L33).

### Medio
- El analisis estructural no valida marcadores JPEG internos (APPx, SOS, tamaños) ni CRC de chunks PNG; solo verifica cabecera/EOF. Puede pasar por alto ciertos payloads en chunks validos. Ver [app/services/file_analysis.py](app/services/file_analysis.py#L49).
- El analisis LSB/chi/DCT es heuristico y puede tener falsos positivos/negativos sin umbrales ajustables ni calibracion por tipo de imagen.

### Bajo
- El flujo guarda PNG re-encodeado incluso si el input es JPEG; esto altera el archivo original. Puede ser aceptable, pero no se documenta en el requisito.

## Notas
- El flujo para PDFs tambien existe, pero RF03 se centra en imagenes. Ver [app/services/file_analysis.py](app/services/file_analysis.py#L73).
