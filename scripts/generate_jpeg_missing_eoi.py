import io
from pathlib import Path

from PIL import Image


def main() -> None:
    out_path = Path("jpeg_missing_eoi.jpg")

    img = Image.new("RGB", (64, 64), color=(180, 40, 90))
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    data = buffer.getvalue()

    eoi = b"\xFF\xD9"
    eoi_index = data.rfind(eoi)
    if eoi_index == -1:
        raise RuntimeError("EOI marker not found.")

    modified = data[:eoi_index]
    out_path.write_bytes(modified)
    print(f"Wrote {out_path.resolve()}")


if __name__ == "__main__":
    main()
