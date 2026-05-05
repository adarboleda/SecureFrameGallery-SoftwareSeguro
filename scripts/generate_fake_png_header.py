from pathlib import Path


def main() -> None:
    out_path = Path("fake_png_header.png")

    signature = b"\x89PNG\r\n\x1a\n"
    # Declared length is 20, but file ends early -> chunk overflow
    fake_chunk = b"\x00\x00\x00\x14" + b"ABCD" + b"short"

    out_path.write_bytes(signature + fake_chunk)
    print(f"Wrote {out_path.resolve()}")


if __name__ == "__main__":
    main()
