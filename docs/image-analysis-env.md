# Parametros de analisis de imagen (RF03)

Este archivo documenta los parametros configurables del analisis de esteganografia y estructura.
Se definen en el .env del backend.

## Variables disponibles

### LSB_RATIO_MIN
- Rango inferior permitido para la proporcion de bits 1 en el plano LSB.
- Si el valor real cae entre LSB_RATIO_MIN y LSB_RATIO_MAX, se marca como sospechoso.
- Valor por defecto: 0.499
- Ejemplo:
  LSB_RATIO_MIN=0.498

### LSB_RATIO_MAX
- Rango superior permitido para la proporcion de bits 1 en el plano LSB.
- Si el valor real cae entre LSB_RATIO_MIN y LSB_RATIO_MAX, se marca como sospechoso.
- Valor por defecto: 0.501
- Ejemplo:
  LSB_RATIO_MAX=0.502

### CHI_P_THRESHOLD
- Umbral del p-value del test chi-cuadrado.
- Si el p-value es mayor que este umbral, se marca como sospechoso.
- Valor por defecto: 0.99
- Ejemplo:
  CHI_P_THRESHOLD=0.995

### DCT_VARIANCE_THRESHOLD
- Umbral minimo de varianza de diferencias horizontales/verticales.
- Si la varianza es menor, se marca como sospechoso.
- Valor por defecto: 10.0
- Ejemplo:
  DCT_VARIANCE_THRESHOLD=8.0

## Ejemplo completo de .env (backend)

LSB_RATIO_MIN=0.498
LSB_RATIO_MAX=0.502
CHI_P_THRESHOLD=0.995
DCT_VARIANCE_THRESHOLD=8.0

## Notas
- Despues de cambiar estos valores, reinicia el backend.
- Ajustes muy agresivos pueden aumentar falsos positivos.

## Scripts de prueba
- scripts/generate_invalid_png_crc.py: genera un PNG con CRC invalido.
- scripts/generate_invalid_jpeg_no_sos.py: genera un JPEG sin marcador SOS.
- scripts/generate_jpeg_trailing_data.py: agrega bytes despues del EOI (EOF attack).
- scripts/generate_jpeg_missing_eoi.py: genera un JPEG sin EOI.
- scripts/generate_png_trailing_data.py: agrega bytes despues del IEND (EOF attack).
- scripts/generate_png_missing_iend.py: genera un PNG sin IEND.
- scripts/generate_fake_png_header.py: firma PNG valida con chunk invalido.
- scripts/generate_jpeg_with_png_extension.py: JPEG con extension .png (prueba de magic bytes).
- scripts/generate_exif_gps_jpeg.py: JPEG con EXIF GPS (requiere piexif).
- scripts/attack_lsb_image.py: inyeccion LSB en canal rojo.
- scripts/attack_pdf_embed.py: PDF con archivo embebido oculto.
