import numpy as np
from PIL import Image
from pathlib import Path

def inject_heavy_lsb(input_path: str, output_path: str) -> None:
    print(f"Leyendo imagen real: {input_path}")
    if not Path(input_path).exists():
        print(f"Error: No se encontró {input_path}")
        return

    img = Image.open(input_path).convert("RGB")
    img_array = np.array(img)

    # Generamos "ruido" completamente aleatorio (0 o 1) para simular un archivo .zip encriptado gigante
    # Esto forzará que la entropía LSB se vuelva perfecta (~0.500)
    noise = np.random.randint(0, 2, img_array.shape, dtype=np.uint8)
    
    # Limpiamos el último bit original y le sumamos nuestro ruido
    mask = np.uint8(0xFE)
    img_array = (img_array & mask) | noise

    infected = Image.fromarray(img_array)
    # Guardar como PNG
    infected.save(output_path, format="PNG")
    print(f"Infección agresiva LSB simulando archivo pesado exitosa. Guardado en: {output_path}")

if __name__ == "__main__":
    inject_heavy_lsb("input.jpg", "lsb_file_infected.png")
