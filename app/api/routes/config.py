from fastapi import APIRouter
from app.core.config import settings

router = APIRouter()


@router.get("/thresholds")
def get_analysis_thresholds():
    """
    Expone los umbrales de análisis de seguridad usados por el motor de detección.
    Solo devuelve valores numéricos de configuración — no expone credenciales ni datos sensibles.
    Usado por el frontend para renderizar gráficos comparativos en el reporte de cuarentena.
    """
    return {
        "image": {
            "lsb_ratio_min": settings.LSB_RATIO_MIN,
            "lsb_ratio_max": settings.LSB_RATIO_MAX,
            "chi_p_threshold": settings.CHI_P_THRESHOLD,
            "dct_variance_threshold": settings.DCT_VARIANCE_THRESHOLD,
        },
        "description": {
            "lsb_ratio": "Ratio de bits LSB=1. Zona sospechosa: entre lsb_ratio_min y lsb_ratio_max.",
            "chi_p": "p-value del test Chi-cuadrado. Valor > chi_p_threshold indica distribución artificial.",
            "dct_variance": "Proxy de varianza DCT. Valor < dct_variance_threshold indica imagen demasiado suavizada.",
        },
    }
