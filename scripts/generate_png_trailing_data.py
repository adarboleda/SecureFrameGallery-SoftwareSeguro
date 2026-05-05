import io
from pathlib import Path

from PIL import Image


def main() -> None:
    out_path = Path("png_trailing_data.png")

    img = Image.new("RGB", (64, 64), color=(250, 200, 20))
    buffer = io.BytesIO()
    img.save(buffer, format="PNG")
    data = buffer.getvalue()

    trailing = b"\x00TRAILINGDATA"
    modified = data + trailing

    out_path.write_bytes(modified)
    print(f"Wrote {out_path.resolve()}")


if __name__ == "__main__":
    main()
