from pathlib import Path

try:
    import piexif
except Exception:
    piexif = None

from PIL import Image


def main() -> None:
    if piexif is None:
        print("piexif is required. Install with: pip install piexif")
        return

    out_path = Path("jpeg_with_exif_gps.jpg")

    img = Image.new("RGB", (64, 64), color=(120, 160, 200))

    zeroth = {piexif.ImageIFD.Make: u"TestCam"}
    gps = {
        piexif.GPSIFD.GPSLatitudeRef: "N",
        piexif.GPSIFD.GPSLatitude: ((4, 1), (35, 1), (0, 1)),
        piexif.GPSIFD.GPSLongitudeRef: "W",
        piexif.GPSIFD.GPSLongitude: ((74, 1), (5, 1), (0, 1)),
    }

    exif_dict = {"0th": zeroth, "GPS": gps}
    exif_bytes = piexif.dump(exif_dict)

    img.save(out_path, format="JPEG", exif=exif_bytes)
    print(f"Wrote {out_path.resolve()}")


if __name__ == "__main__":
    main()
