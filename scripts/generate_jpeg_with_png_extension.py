import io
from pathlib import Path

from PIL import Image


def main() -> None:
    out_path = Path("jpeg_named_png.png")

    img = Image.new("RGB", (64, 64), color=(20, 20, 20))
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    data = buffer.getvalue()

    out_path.write_bytes(data)
    print(f"Wrote {out_path.resolve()}")


if __name__ == "__main__":
    main()
