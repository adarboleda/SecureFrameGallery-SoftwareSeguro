import numpy as np
from PIL import Image
from pathlib import Path

def text_to_binary(text: str) -> str:
    return ''.join(format(ord(c), '08b') for c in text)

def inject_lsb_text(input_path: str, output_path: str, secret_message: str) -> None:
    print(f"Leyendo imagen real: {input_path}")
    if not Path(input_path).exists():
        print(f"Error: No se encontró {input_path}")
        return

    img = Image.open(input_path).convert("RGB")
    img_array = np.array(img)

    binary_msg = text_to_binary(secret_message)
    # Agregar un terminador para saber dónde termina el mensaje (opcional, pero buena práctica)
    binary_msg += '1111111111111110' 
    
    msg_len = len(binary_msg)
    max_bytes = img_array.shape[0] * img_array.shape[1] * 3

    if msg_len > max_bytes:
        raise ValueError("El mensaje es demasiado largo para esta imagen.")

    # Aplanar la imagen para iterar fácilmente sobre los píxeles
    flat_img = img_array.flatten()

    # Inyectar el mensaje bit a bit en el LSB
    for i in range(msg_len):
        bit = int(binary_msg[i])
        # Limpiar el último bit y poner el del mensaje usando máscara 0xFE (254)
        flat_img[i] = (flat_img[i] & 0xFE) | bit

    # Reconstruir la imagen
    infected_img_array = flat_img.reshape(img_array.shape)
    infected = Image.fromarray(infected_img_array)
    
    # Guardar como PNG para no perder los LSB por compresión JPEG
    infected.save(output_path, format="PNG")
    print(f"Infección LSB de texto exitosa. Guardado en: {output_path}")

if __name__ == "__main__":
    mensaje_secreto = "ESTE ES UN MENSAJE SUPER SECRETO PARA PROBAR EL SISTEMA DE SEGURIDAD. " * 50
    inject_lsb_text("input.jpg", "lsb_text_infected.png", mensaje_secreto)
