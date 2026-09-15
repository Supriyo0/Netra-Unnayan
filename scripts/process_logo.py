import os
import numpy as np
from PIL import Image, ImageEnhance, ImageFilter

src = r"C:\Users\supri\.gemini\antigravity-ide\brain\179cbcff-c32d-4de1-b05a-586d15e21401\.user_uploaded\media_1789244696612.png"
out_dir = r"C:\Users\supri\Desktop\Netra Unnayan\public_assets"
os.makedirs(out_dir, exist_ok=True)

im = Image.open(src).convert("RGBA")
arr = np.array(im, dtype=np.float32)

# Bounding box of full content:
# Symbol: Y=110..315, X=350..710
# Brand: Y=344..390, X=238..785
# Tagline: Y=406..444, X=315..710
# Full logo bounding box with safe padding:
y_min, y_max = 110, 448
x_min, x_max = 230, 792

cropped = arr[y_min:y_max, x_min:x_max].copy()

# Sample background color around top empty space
bg_color = np.array([249.0, 251.0, 250.0], dtype=np.float32)

rgb = cropped[:, :, :3]
diff = np.sqrt(np.sum((rgb - bg_color) ** 2, axis=2))

# Smooth alpha calculation with soft anti-aliasing curve
# Diff < 18 -> background (alpha = 0)
# Diff > 65 -> solid foreground (alpha = 255)
alpha = np.clip((diff - 18.0) / (65.0 - 18.0), 0.0, 1.0) * 255.0

# In the center of the iris/aperture (which is white background inside the eye),
# let's make sure it is transparent as intended in the circular aperture hole.
# The aperture center is at approximately y=213-110=103, x=510-230=280
# Its diff with bg_color is small, so alpha naturally goes to 0, which is perfectly transparent!

# Recover unmultiplied color to eliminate white fringe:
# C_fg = (C_observed - (1 - alpha) * C_bg) / alpha
alpha_norm = (alpha / 255.0)[:, :, np.newaxis]
rgb_clean = np.where(
    alpha_norm > 0.05,
    np.clip((rgb - (1.0 - alpha_norm) * bg_color) / np.maximum(alpha_norm, 0.05), 0.0, 255.0),
    rgb
)

# Assemble clean RGBA image
res_full = np.dstack([rgb_clean, alpha]).astype(np.uint8)
img_full = Image.fromarray(res_full, "RGBA")

# Crop tightly to actual content
bbox = img_full.getbbox()
if bbox:
    img_full = img_full.crop(bbox)

# 1. Full logo (stacked: Symbol + NETRA UNNAYAN + Clarity You Can Trust)
full_path = os.path.join(out_dir, "logo_full.png")
img_full.save(full_path, "PNG")
print("Saved:", full_path, img_full.size)

# 2. Symbol only (for favicon, loader, mobile)
# Symbol is top portion up to ~y=318 in original coords
symbol_y_end = 318 - y_min
symbol_crop = res_full[:symbol_y_end, :]
img_symbol = Image.fromarray(symbol_crop, "RGBA")
s_bbox = img_symbol.getbbox()
if s_bbox:
    img_symbol = img_symbol.crop(s_bbox)

symbol_path = os.path.join(out_dir, "logo_symbol.png")
img_symbol.save(symbol_path, "PNG")
print("Saved:", symbol_path, img_symbol.size)

# Save favicon variants
favicon_32 = img_symbol.resize((32, 32), Image.Resampling.LANCZOS)
favicon_32.save(os.path.join(out_dir, "favicon.png"), "PNG")
favicon_192 = img_symbol.resize((192, 192), Image.Resampling.LANCZOS)
favicon_192.save(os.path.join(out_dir, "icon-192.png"), "PNG")

# 3. Text only (NETRA UNNAYAN + Tagline)
text_y_start = 335 - y_min
text_crop = res_full[text_y_start:, :]
img_text = Image.fromarray(text_crop, "RGBA")
t_bbox = img_text.getbbox()
if t_bbox:
    img_text = img_text.crop(t_bbox)

# 4. Horizontal Logo (Symbol on left, Typography on right) - perfect for desktop & tablet navbars!
# Scale symbol and text to harmonious heights
target_h = 70
s_scale = target_h / img_symbol.size[1]
s_w = int(img_symbol.size[0] * s_scale)
s_resized = img_symbol.resize((s_w, target_h), Image.Resampling.LANCZOS)

t_scale = target_h / img_text.size[1]
t_w = int(img_text.size[0] * t_scale)
t_resized = img_text.resize((t_w, target_h), Image.Resampling.LANCZOS)

gap = 18
h_logo = Image.new("RGBA", (s_w + gap + t_w, target_h), (0, 0, 0, 0))
h_logo.paste(s_resized, (0, 0), s_resized)
h_logo.paste(t_resized, (s_w + gap, 0), t_resized)

h_path = os.path.join(out_dir, "logo_horizontal.png")
h_logo.save(h_path, "PNG")
print("Saved:", h_path, h_logo.size)

# 5. White / Light Mode Version for Dark Glassmorphism Header
# Transform navy text/symbol to crisp white/glow while preserving the vibrant cyan arrow/accents
def make_white_version(img):
    arr_in = np.array(img, dtype=np.float32)
    r, g, b, a = arr_in[:, :, 0], arr_in[:, :, 1], arr_in[:, :, 2], arr_in[:, :, 3]
    # Detect cyan arrow: R < 130, G > 100, B > 150
    is_cyan = (r < 130) & (g > 100) & (b > 150)
    # Brighten cyan to vivid glowing cyan
    r[is_cyan] = np.clip(r[is_cyan] * 1.1, 0, 80)
    g[is_cyan] = np.clip(g[is_cyan] * 1.25, 0, 220)
    b[is_cyan] = 255.0
    # Navy parts (low green, low red) become pure white
    is_navy = ~is_cyan & (a > 10)
    r[is_navy] = 255.0
    g[is_navy] = 255.0
    b[is_navy] = 255.0
    out_arr = np.dstack([r, g, b, a]).astype(np.uint8)
    return Image.fromarray(out_arr, "RGBA")

white_h = make_white_version(h_logo)
white_h.save(os.path.join(out_dir, "logo_horizontal_white.png"), "PNG")

white_full = make_white_version(img_full)
white_full.save(os.path.join(out_dir, "logo_full_white.png"), "PNG")
print("Saved white versions.")

# 6. Monochrome high-contrast print version for barcode/QR thermal printer
def make_print_version(img):
    arr_in = np.array(img, dtype=np.float32)
    a = arr_in[:, :, 3]
    # Solid black where alpha > 40
    black = np.zeros_like(arr_in[:, :, :3])
    out_arr = np.dstack([black, a]).astype(np.uint8)
    return Image.fromarray(out_arr, "RGBA")

print_h = make_print_version(h_logo)
print_h.save(os.path.join(out_dir, "logo_print.png"), "PNG")
print("All logo assets created successfully in", out_dir)
