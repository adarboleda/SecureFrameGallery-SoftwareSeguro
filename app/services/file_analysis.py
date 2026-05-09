import numpy as np
from PIL import Image
from scipy.stats import chisquare
import io
import fitz  # PyMuPDF
import zlib
from app.core.config import settings

def analyze_image_steganography(img: Image.Image) -> dict:
    """
    Analiza la imagen usando LSB Espacial, Chi-cuadrado y pseudo-DCT para detección de esteganografía.
    """
    # 1. Extracción de Plano de Bits (LSB Espacial)
    img_array = np.array(img.convert('RGB'))
    lsb_array = img_array & 1
    
    ratio_ones = float(np.sum(lsb_array) / lsb_array.size)
    # La entropía en imágenes naturales rara vez es exactamente 0.5.
    lsb_suspicious = settings.LSB_RATIO_MIN < ratio_ones < settings.LSB_RATIO_MAX
    
    # 2. Ataque Estadístico Chi-Cuadrado (PoV)
    flat_img = img_array[:,:,0].flatten()
    hist, _ = np.histogram(flat_img, bins=256, range=(0, 256))
    
    expected = []
    observed = []
    for i in range(0, 255, 2):
        pair_sum = hist[i] + hist[i+1]
        if pair_sum > 5:
            avg = pair_sum / 2.0
            expected.extend([avg, avg])
            observed.extend([hist[i], hist[i+1]])
            
    chi_suspicious = False
    chi_p_value = 0.0
    if len(expected) > 0:
        _, chi_p_value = chisquare(f_obs=observed, f_exp=expected)
        # Un p-value cercano a 1.0 (>0.99) indica manipulación artificial (frecuencias idénticas)
        if chi_p_value > settings.CHI_P_THRESHOLD:
            chi_suspicious = True

    # 3. Análisis pseudo-DCT (Detección de variaciones anómalas)
    diff_h = np.diff(img_array, axis=1)
    diff_v = np.diff(img_array, axis=0)
    dct_variance_proxy = float(np.var(diff_h) + np.var(diff_v))
    dct_suspicious = dct_variance_proxy < settings.DCT_VARIANCE_THRESHOLD
    
    is_suspicious = lsb_suspicious or chi_suspicious or dct_suspicious
    
    return {
        "is_suspicious": bool(is_suspicious),
        "lsb_ratio_ones": ratio_ones,
        "chi_square_p_value": float(chi_p_value),
        "dct_variance_proxy": dct_variance_proxy,
        "details": {
            "lsb_anomaly": bool(lsb_suspicious),
            "chi_square_anomaly": bool(chi_suspicious),
            "dct_anomaly": bool(dct_suspicious)
        }
    }


def verify_image_structure(file_bytes: bytes, mime_type: str) -> dict:
    if mime_type == "image/jpeg":
        return _check_jpeg_structure(file_bytes)
    if mime_type == "image/png":
        return _check_png_structure(file_bytes)

    return {"ok": True, "details": "unsupported"}


def _check_jpeg_structure(file_bytes: bytes) -> dict:
    if not file_bytes.startswith(b"\xFF\xD8"):
        return {"ok": False, "details": "jpeg_missing_soi"}

    eoi_index = file_bytes.rfind(b"\xFF\xD9")
    if eoi_index == -1:
        return {"ok": False, "details": "jpeg_missing_eoi"}

    pos = 2
    found_sos = False
    data_len = len(file_bytes)
    while pos < data_len:
        if pos >= eoi_index:
            break

        if file_bytes[pos] != 0xFF:
            if not found_sos:
                return {"ok": False, "details": "jpeg_invalid_marker"}
            pos += 1
            continue

        while pos < data_len and file_bytes[pos] == 0xFF:
            pos += 1
        if pos >= data_len:
            break

        marker = file_bytes[pos]
        pos += 1

        if marker == 0xD9:
            break

        if marker == 0xDA:
            found_sos = True
            if pos + 2 > data_len:
                return {"ok": False, "details": "jpeg_missing_sos_length"}
            seg_len = int.from_bytes(file_bytes[pos : pos + 2], "big")
            if seg_len < 2:
                return {"ok": False, "details": "jpeg_invalid_segment_length"}
            pos += seg_len
            continue

        if marker == 0x01 or 0xD0 <= marker <= 0xD7 or marker == 0xD8:
            continue

        if pos + 2 > data_len:
            return {"ok": False, "details": "jpeg_missing_segment_length"}

        seg_len = int.from_bytes(file_bytes[pos : pos + 2], "big")
        if seg_len < 2:
            return {"ok": False, "details": "jpeg_invalid_segment_length"}

        if pos + seg_len > data_len:
            return {"ok": False, "details": "jpeg_segment_overflow"}

        pos += seg_len

    if not found_sos:
        return {"ok": False, "details": "jpeg_missing_sos"}

    trailing = file_bytes[eoi_index + 2 :]
    if trailing.strip(b"\x00\x0A\x0D\x20\t"):
        return {"ok": False, "details": "jpeg_trailing_data"}

    return {"ok": True, "details": "jpeg_ok"}


def _check_png_structure(file_bytes: bytes) -> dict:
    signature = b"\x89PNG\r\n\x1a\n"
    if not file_bytes.startswith(signature):
        return {"ok": False, "details": "png_missing_signature"}

    offset = len(signature)
    found_iend = False
    data_len = len(file_bytes)
    while offset + 12 <= data_len:
        length = int.from_bytes(file_bytes[offset : offset + 4], "big")
        chunk_type = file_bytes[offset + 4 : offset + 8]
        offset += 8

        if offset + length + 4 > data_len:
            return {"ok": False, "details": "png_chunk_overflow"}

        chunk_data = file_bytes[offset : offset + length]
        crc_read = int.from_bytes(file_bytes[offset + length : offset + length + 4], "big")
        crc_calc = zlib.crc32(chunk_type)
        crc_calc = zlib.crc32(chunk_data, crc_calc) & 0xFFFFFFFF
        if crc_read != crc_calc:
            return {"ok": False, "details": "png_crc_mismatch"}

        offset += length
        offset += 4  # CRC

        if chunk_type == b"IEND":
            found_iend = True
            break

    if not found_iend:
        return {"ok": False, "details": "png_missing_iend"}

    trailing = file_bytes[offset:]
    if trailing.strip(b"\x00\x0A\x0D\x20\t"):
        return {"ok": False, "details": "png_trailing_data"}

    return {"ok": True, "details": "png_ok"}

def analyze_pdf_security(file_bytes: bytes) -> dict:
    """
    Analiza un PDF en busca de patrones maliciosos reales.
    Optimizado para evitar Falsos Positivos de archivos exportados desde MS Word/LibreOffice.

    NOTA DE COMPATIBILIDAD: fitz.LINK_JAVASCRIPT fue eliminada en PyMuPDF >= 1.24.
    Se usa el valor numérico histórico (5) con getattr como fallback seguro.
    Cada bloque de detección tiene su propio try/except para que un fallo en uno
    no silenciosamente cancele los demás.
    """
    is_suspicious = False
    details = []
    embedded_count = 0
    embedded_names: list[str] = []

    # Constante LINK_JAVASCRIPT: eliminada en PyMuPDF >= 1.24, era el valor 5.
    LINK_JAVASCRIPT = getattr(fitz, "LINK_JAVASCRIPT", 5)

    doc = None
    try:
        # Abrir desde memoria RAM para evitar el error "cannot open file 'pdf'"
        doc = fitz.open(stream=file_bytes, filetype="pdf")
    except Exception as e:
        error_msg = str(e).lower()
        if any(kw in error_msg for kw in ["encrypted", "malformed"]):
            is_suspicious = True
            details.append(f"Estructura del PDF potencialmente manipulada: {str(e)}")
        # Si no se pudo abrir, aún verificamos los bytes crudos más abajo

    if doc is not None:
        # 1. Buscar JavaScript en enlaces (cada página en su propio try para mayor robustez)
        try:
            for page_num in range(len(doc)):
                page = doc[page_num]
                links = page.get_links()
                for link in links:
                    # Detectar por kind numérico y también por esquema URI javascript:
                    link_kind = link.get("kind")
                    link_uri = str(link.get("uri") or "").lower()
                    if link_kind == LINK_JAVASCRIPT or link_uri.startswith("javascript:"):
                        is_suspicious = True
                        details.append(
                            f"JavaScript embebido detectado en un enlace de la página {page_num+1}."
                        )
        except Exception:
            pass  # No bloqueamos el resto del análisis por un fallo en links

        # 2. Buscar JavaScript en widgets/formularios
        try:
            for page_num in range(len(doc)):
                page = doc[page_num]
                try:
                    widgets = page.widgets()
                    if widgets:
                        for widget in widgets:
                            if widget.script:
                                is_suspicious = True
                                details.append(
                                    f"JavaScript en widget (Formulario) detectado en la página {page_num+1}."
                                )
                except Exception:
                    pass  # Ignoramos fallos al leer widgets de una página
        except Exception:
            pass

        # 3. Archivos embebidos ocultos (compatibilidad entre versiones PyMuPDF)
        try:
            if hasattr(doc, "embfile_names"):
                embedded_names = doc.embfile_names() or []
                embedded_count = len(embedded_names)
        except Exception:
            embedded_names = []
            embedded_count = 0

        if embedded_count == 0:
            try:
                if hasattr(doc, "embfile_count"):
                    embedded_count = int(doc.embfile_count() or 0)
                elif hasattr(doc, "embedded_file_count"):
                    embedded_count = int(doc.embedded_file_count() or 0)
            except Exception:
                embedded_count = 0

        doc.close()

    # 4. Fallback de bytes crudos si la API de fitz no detectó nada
    if embedded_count == 0:
        try:
            if b"/EmbeddedFiles" in file_bytes or b"/EmbeddedFile" in file_bytes:
                embedded_count = 1
        except Exception:
            embedded_count = 0

    if embedded_count > 0:
        is_suspicious = True
        if embedded_names:
            details.append(
                "Archivos embebidos detectados: " + ", ".join(embedded_names)
            )
        else:
            details.append(
                f"El PDF contiene {embedded_count} archivo(s) oculto(s) embebido(s)."
            )

    return {
        "is_suspicious": bool(is_suspicious),
        "pdf_details": details,
        "embedded_count": int(embedded_count),
        "pdf_has_embedded": bool(embedded_count > 0)
    }

def strip_exif(img: Image.Image) -> Image.Image:
    data = list(img.getdata())
    clean_img = Image.new(img.mode, img.size)
    clean_img.putdata(data)
    return clean_img
