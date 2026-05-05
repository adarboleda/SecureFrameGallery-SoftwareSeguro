import io
from pathlib import Path

from PIL import Image


def main() -> None:
    out_path = Path("invalid_crc.png")

    img = Image.new("RGB", (64, 64), color=(255, 0, 0))
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    data = bytearray(buffer.getvalue())

    signature = b"\x89PNG\r\n\x1a\n"
    if not data.startswith(signature):
        raise RuntimeError("PNG signature not found.")

    # First chunk starts right after signature: length(4) + type(4) + data + crc(4)
    offset = len(signature)
    if offset + 12 > len(data):
        raise RuntimeError("PNG too small.")

    length = int.from_bytes(data[offset:offset + 4], "big")
    chunk_type = data[offset + 4:offset + 8]
    if chunk_type != b"IHDR":
        raise RuntimeError("Unexpected first chunk; expected IHDR.")

    crc_index = offset + 8 + length
    if crc_index + 4 > len(data):
        raise RuntimeError("CRC out of bounds.")

    # Corrupt CRC by flipping one bit
    data[crc_index] ^= 0x01

    out_path.write_bytes(data)
    print(f"Wrote {out_path.resolve()}")


if __name__ == "__main__":
    main()
