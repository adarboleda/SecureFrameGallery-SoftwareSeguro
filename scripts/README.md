# Scripts de prueba RF03

Este folder contiene scripts para generar archivos de prueba y validar el flujo RF03.

## Uso rapido

1) Ejecuta un script:
   python scripts/nombre_script.py

2) El archivo de salida se crea en la raiz del proyecto.

3) Sube el archivo en la app y verifica el resultado esperado.

## Resultado esperado (resumen)

- Estructura invalida (JPEG/PNG): debe fallar la subida con "Invalid image structure".
- Esteganografia LSB: debe ir a cuarentena.
- PDF con archivo embebido: debe ir a cuarentena.
- Magic bytes: se valida por contenido real, no por extension.
- EXIF GPS: debe eliminarse al re-encodear (no debe quedar en el archivo final).

## Imagenes

### scripts/attack_lsb_image.py
- Que hace: inyecta ruido LSB en el canal rojo y guarda PNG lossless.
- Parte RF03: analisis esteganografico (LSB/chi/DCT).
- Resultado esperado: archivo marcado como sospechoso y enviado a cuarentena.
- Uso: requiere un archivo "input.jpg" en la raiz; genera "lsb_infected.png".

### scripts/generate_invalid_png_crc.py
- Que hace: genera un PNG con CRC invalido en el primer chunk.
- Parte RF03: analisis estructural PNG (CRC).
- Resultado esperado: rechazo por "png_crc_mismatch".

### scripts/generate_png_trailing_data.py
- Que hace: agrega bytes despues de IEND.
- Parte RF03: EOF attack / trailing data.
- Resultado esperado: rechazo por "png_trailing_data".

### scripts/generate_png_missing_iend.py
- Que hace: elimina el chunk IEND.
- Parte RF03: estructura basica PNG.
- Resultado esperado: rechazo por "png_missing_iend".

### scripts/generate_fake_png_header.py
- Que hace: firma PNG valida pero chunk incompleto (overflow).
- Parte RF03: estructura PNG y longitudes.
- Resultado esperado: rechazo por "png_chunk_overflow".

### scripts/generate_invalid_jpeg_no_sos.py
- Que hace: genera un JPEG sin marcador SOS.
- Parte RF03: estructura JPEG interna.
- Resultado esperado: rechazo por "jpeg_missing_sos".

### scripts/generate_jpeg_trailing_data.py
- Que hace: agrega bytes despues del EOI.
- Parte RF03: EOF attack / trailing data.
- Resultado esperado: rechazo por "jpeg_trailing_data".

### scripts/generate_jpeg_missing_eoi.py
- Que hace: elimina el marcador EOI.
- Parte RF03: estructura JPEG basica.
- Resultado esperado: rechazo por "jpeg_missing_eoi".

### scripts/generate_jpeg_with_png_extension.py
- Que hace: crea un JPEG con extension .png.
- Parte RF03: magic bytes vs extension.
- Resultado esperado: debe aceptarse como JPEG (no depende de la extension).

### scripts/generate_exif_gps_jpeg.py
- Que hace: genera un JPEG con EXIF GPS.
- Parte RF03: stripping de EXIF.
- Resultado esperado: el archivo subido se re-encodea y no conserva EXIF.
- Nota: requiere piexif (pip install piexif).

## Documentos (PDF)

### scripts/attack_pdf_embed.py
- Que hace: embebe un archivo oculto dentro del PDF.
- Parte RF03: analisis PDF (archivos embebidos).
- Resultado esperado: archivo en cuarentena con detalle de "archivo(s) oculto(s)".
- Uso: requiere un archivo "input.pdf" en la raiz; genera "pdf_embedded_payload.pdf".

## Notas
- Si la app cambia los mensajes de error, el codigo puede variar, pero el resultado esperado sigue siendo el mismo.
- Para pruebas mas agresivas, ajusta umbrales en el .env del backend (ver docs/image-analysis-env.md).
