import fitz  # PyMuPDF

def embed_hidden_file(input_path: str, output_path: str) -> None:
    print(f"Reading input: {input_path}")
    doc = fitz.open(input_path)

    payload = b"Hidden file injected for testing."
    doc.embfile_add(
        name="hidden.txt",
        buffer=payload,
        filename="hidden.txt",
        desc="Embedded test payload"
    )

    doc.save(output_path)
    doc.close()
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    embed_hidden_file("input.pdf", "pdf_embedded_payload.pdf")
