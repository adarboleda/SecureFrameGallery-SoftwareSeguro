import numpy as np
from PIL import Image

def analyze_lsb_steganography(img: Image.Image) -> dict:
    """
    Analiza el Bit Menos Significativo (LSB) buscando anomalías de entropía.
    """
    # 1. Convertir la imagen a una matriz matemática de píxeles
    img_array = np.array(img)
    
    # 2. Extraer solo el plano del bit menos significativo usando operador AND bit a bit
    lsb_array = img_array & 1
    
    # 3. Calcular la proporción de bits '1'
    ratio_ones = np.sum(lsb_array) / lsb_array.size
    
    # 4. Heurística de detección:
    is_suspicious = 0.495 < ratio_ones < 0.505
    
    return {
        "is_suspicious": bool(is_suspicious),
        "lsb_ratio_ones": float(ratio_ones)
    }

def strip_exif(img: Image.Image) -> Image.Image:
    """
    Elimina los metadatos EXIF creando una imagen nueva solo con los datos de los píxeles.
    """
    data = list(img.getdata())
    clean_img = Image.new(img.mode, img.size)
    clean_img.putdata(data)
    return clean_img
