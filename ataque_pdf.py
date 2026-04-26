import fitz  # PyMuPDF

def inyectar_payload_pdf(ruta_entrada, ruta_salida):
    print(f"Abriendo PDF legítimo: {ruta_entrada}")
    doc = fitz.open(ruta_entrada)
    
    # 1. Creamos nuestro "Payload" (Un texto simple, pero podría ser un virus.exe)
    payload_secreto = b"Este es un mensaje oculto inyectado por el atacante."
    
    # 2. Embebemos el archivo dentro del contenedor del PDF
    # Un lector de PDF normal (como Chrome) jamás mostrará este archivo.
    doc.embfile_add(
        name="secreto.txt", 
        buffer=payload_secreto, 
        filename="secreto.txt", 
        desc="Archivo malicioso oculto"
    )
    
    # 3. Guardamos el PDF infectado
    doc.save(ruta_salida)
    doc.close()
    print(f"¡PDF manipulado con éxito! Guardado en: {ruta_salida}")

# --- Ejecución ---
# Pon el PDF de tu tarea aquí
inyectar_payload_pdf("ACT_IND_1_P1_ARBOLEDA_ABNER.pdf", "ACT_IND_1_INFECTADO.pdf")