import numpy as np
from PIL import Image

def inject_lsb_noise(input_path: str, output_path: str) -> None:
    print(f"Reading input: {input_path}")
    img = Image.open(input_path).convert("RGB")
    img_array = np.array(img)

    noise = np.random.randint(0, 2, img_array[:, :, 0].shape, dtype=np.uint8)
    mask = np.uint8(0xFE)
    img_array[:, :, 0] = (img_array[:, :, 0] & mask) | noise

    infected = Image.fromarray(img_array)
    infected.save(output_path, format="PNG")
    print(f"Wrote {output_path}")


if __name__ == "__main__":
    inject_lsb_noise("input.jpg", "lsb_infected.png")
