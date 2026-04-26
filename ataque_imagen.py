from PIL import Image
import numpy as np

def inyectar_esteganografia_lsb(ruta_entrada, ruta_salida):
    print(f"Abriendo imagen original: {ruta_entrada}")
    img = Image.open(ruta_entrada).convert('RGB')
    img_array = np.array(img)
    
    # 1. Generamos "ruido" perfecto (ceros y unos aleatorios)
    # Esto simula un archivo cifrado que queremos ocultar en la imagen
    ruido = np.random.randint(0, 2, img_array[:,:,0].shape, dtype=np.uint8)
    
    # 2. Atacamos el canal Rojo (que es el que tu Chi-Cuadrado vigila)
    # Apagamos el último bit original y le pegamos nuestro ruido malicioso
    img_array[:,:,0] = (img_array[:,:,0] & ~1) | ruido
    
    # 3. Guardamos la imagen modificada en formato PNG (Lossless)
    # Si la guardas en JPG, la compresión destruirá el ataque.
    img_infectada = Image.fromarray(img_array)
    img_infectada.save(ruta_salida, format="PNG")
    print(f"¡Imagen manipulada con éxito! Guardada en: {ruta_salida}")

# --- Ejecución ---
# Pon una imagen tuya normal en la carpeta y pon su nombre aquí
inyectar_esteganografia_lsb("foto_normal.jpg", "foto_infectada.png")