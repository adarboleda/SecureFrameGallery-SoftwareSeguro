import numpy as np
from PIL import Image
from scipy.stats import chisquare

def analyze_image_steganography(img: Image.Image) -> dict:
    """
    Analiza la imagen usando LSB Espacial, Chi-cuadrado y pseudo-DCT para detección de esteganografía.
    """
    # 1. Extracción de Plano de Bits (LSB Espacial)
    # Convertimos a RGB explícitamente para mantener consistencia en la matriz
    img_array = np.array(img.convert('RGB'))
    lsb_array = img_array & 1
    
    ratio_ones = float(np.sum(lsb_array) / lsb_array.size)
    # La entropía en imágenes naturales rara vez es exactamente 0.5.
    lsb_suspicious = 0.499 < ratio_ones < 0.501
    
    # 2. Ataque Estadístico Chi-Cuadrado (PoV - Pairs of Values)
    # Analizamos solo un canal (el rojo en este caso) para optimizar velocidad
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
        if chi_p_value > 0.99:
            chi_suspicious = True

    # 3. Análisis pseudo-DCT (Detección de variaciones anómalas)
    diff_h = np.diff(img_array, axis=1)
    diff_v = np.diff(img_array, axis=0)
    dct_variance_proxy = float(np.var(diff_h) + np.var(diff_v))
    # Una varianza muy baja indica suavidad antinatural en las frecuencias
    dct_suspicious = dct_variance_proxy < 10.0 
    
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

def strip_exif(img: Image.Image) -> Image.Image:
    """
    Elimina los metadatos EXIF de forma optimizada en memoria.
    Evita el colapso de RAM (Prevención DoS) al no extraer píxel por píxel.
    """
    clean_img = Image.new(img.mode, img.size)
    clean_img.paste(img)
    return clean_img