import io
from pathlib import Path

from PIL import Image


def main() -> None:
    out_path = Path("invalid_no_sos.jpg")

    img = Image.new("RGB", (64, 64), color=(0, 128, 255))
    buffer = io.BytesIO()
    img.save(buffer, format="JPEG", quality=85)
    data = buffer.getvalue()

    sos_marker = b"\xFF\xDA"
    sos_index = data.find(sos_marker)
    if sos_index == -1:
        raise RuntimeError("SOS marker not found in generated JPEG.")

    # Remove SOS segment and everything after it, then add EOI
    eoi = b"\xFF\xD9"
    truncated = data[:sos_index] + eoi

    out_path.write_bytes(truncated)
    print(f"Wrote {out_path.resolve()}")


if __name__ == "__main__":
    main()
