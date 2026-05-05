import io
from pathlib import Path

from PIL import Image


def main() -> None:
    out_path = Path("png_missing_iend.png")

    img = Image.new("RGB", (64, 64), color=(70, 140, 200))
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    data = buffer.getvalue()

    iend = b"IEND"
    iend_index = data.rfind(iend)
    if iend_index == -1:
        raise RuntimeError("IEND chunk not found.")

    # Remove IEND chunk (length + type + data + crc)
    start = iend_index - 4
    if start < 0:
        raise RuntimeError("Invalid IEND position.")

    modified = data[:start]
    out_path.write_bytes(modified)
    print(f"Wrote {out_path.resolve()}")


if __name__ == "__main__":
    main()
