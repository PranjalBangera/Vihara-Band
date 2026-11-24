import os
from PIL import Image, ImageDraw

def generate_icons():
    src_path = r'C:\Users\user\.gemini\antigravity-ide\brain\e6ec4416-a74d-401b-9dbd-19f0aa882536\.user_uploaded\media_1790086719206.jpg'
    res_dir = r'd:\Vihara-Band-Application\android\app\src\main\res'
    web_icons_dir = r'd:\Vihara-Band-Application\src\public\icons'
    os.makedirs(web_icons_dir, exist_ok=True)

    src = Image.open(src_path).convert('RGBA')
    print("Source image loaded: 1024x1024")

    # 1. Update values/ic_launcher_background.xml
    val_bg_path = os.path.join(res_dir, 'values', 'ic_launcher_background.xml')
    with open(val_bg_path, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<resources>\n    <color name="ic_launcher_background">#000000</color>\n</resources>\n')
    print("Updated values/ic_launcher_background.xml to #000000")

    # 2. Update drawable/ic_launcher_background.xml
    draw_bg_path = os.path.join(res_dir, 'drawable', 'ic_launcher_background.xml')
    with open(draw_bg_path, 'w', encoding='utf-8') as f:
        f.write('<?xml version="1.0" encoding="utf-8"?>\n<vector xmlns:android="http://schemas.android.com/apk/res/android"\n    android:width="108dp"\n    android:height="108dp"\n    android:viewportHeight="108"\n    android:viewportWidth="108">\n    <path\n        android:fillColor="#000000"\n        android:pathData="M0,0h108v108h-108z" />\n</vector>\n')
    print("Updated drawable/ic_launcher_background.xml to #000000")

    # 3. Densities and target dimensions
    densities = {
        'mipmap-mdpi': {'legacy': 48, 'fg': 108},
        'mipmap-hdpi': {'legacy': 72, 'fg': 162},
        'mipmap-xhdpi': {'legacy': 96, 'fg': 216},
        'mipmap-xxhdpi': {'legacy': 144, 'fg': 324},
        'mipmap-xxxhdpi': {'legacy': 192, 'fg': 432},
    }

    # SQUIRCLE CROPPED BASE FOR LEGACY & WEB ICONS
    # The squircle badge is roughly in (70, 60, 954, 944)
    crop_box = (70, 60, 954, 944)
    cropped = src.crop(crop_box)
    cw, ch = cropped.size

    # Create a 1024x1024 master squircle with smooth transparent rounded corners
    master_sq_size = 1024
    sq_super = cropped.resize((master_sq_size * 2, master_sq_size * 2), Image.Resampling.LANCZOS)
    sq_mask = Image.new('L', (master_sq_size * 2, master_sq_size * 2), 0)
    draw_sq = ImageDraw.Draw(sq_mask)
    draw_sq.rounded_rectangle((0, 0, master_sq_size * 2, master_sq_size * 2), radius=int(master_sq_size * 2 * 0.22), fill=255)
    
    master_squircle_super = Image.new('RGBA', (master_sq_size * 2, master_sq_size * 2), (0, 0, 0, 0))
    master_squircle_super.paste(sq_super, (0, 0), sq_mask)
    master_squircle = master_squircle_super.resize((master_sq_size, master_sq_size), Image.Resampling.LANCZOS)

    # 4. Save Web / PWA icons
    master_squircle.resize((192, 192), Image.Resampling.LANCZOS).save(os.path.join(web_icons_dir, 'icon-192.png'))
    master_squircle.resize((512, 512), Image.Resampling.LANCZOS).save(os.path.join(web_icons_dir, 'icon-512.png'))
    print("Saved web icons in src/public/icons/ (192.png, 512.png)")

    # 5. Generate Android icons for each density
    for folder, dims in densities.items():
        folder_path = os.path.join(res_dir, folder)
        os.makedirs(folder_path, exist_ok=True)
        legacy_size = dims['legacy']
        fg_size = dims['fg']

        # A. ic_launcher.png (Legacy squircle)
        legacy_sq = master_squircle.resize((legacy_size, legacy_size), Image.Resampling.LANCZOS)
        legacy_sq.save(os.path.join(folder_path, 'ic_launcher.png'))

        # B. ic_launcher_round.png (Legacy round icon)
        # Create round icon with artwork scaled to safe zone
        round_super_size = legacy_size * 4
        art_super_size = int(round_super_size * (330.0 / 432.0))
        scaled_art = src.resize((art_super_size, art_super_size), Image.Resampling.LANCZOS)
        
        round_bg = Image.new('RGBA', (round_super_size, round_super_size), (0, 0, 0, 255))
        offset_art = (round_super_size - art_super_size) // 2
        round_bg.paste(scaled_art, (offset_art, offset_art), scaled_art)

        round_mask = Image.new('L', (round_super_size, round_super_size), 0)
        draw_r = ImageDraw.Draw(round_mask)
        draw_r.ellipse((2, 2, round_super_size - 2, round_super_size - 2), fill=255)

        round_super = Image.new('RGBA', (round_super_size, round_super_size), (0, 0, 0, 0))
        round_super.paste(round_bg, (0, 0), round_mask)
        round_icon = round_super.resize((legacy_size, legacy_size), Image.Resampling.LANCZOS)
        round_icon.save(os.path.join(folder_path, 'ic_launcher_round.png'))

        # C. ic_launcher_foreground.png (Adaptive icon foreground layer, 108dp)
        # Safe scale: 330 / 432 = 0.764
        # At this scale, functional elements occupy 61.75dp inside the 72dp safe zone.
        # This completely prevents cropping on all circular, squircle, and teardrop launchers.
        fg_art_size = int(fg_size * (330.0 / 432.0))
        fg_scaled_art = src.resize((fg_art_size, fg_art_size), Image.Resampling.LANCZOS)

        fg_canvas = Image.new('RGBA', (fg_size, fg_size), (0, 0, 0, 255))
        fg_offset = (fg_size - fg_art_size) // 2
        fg_canvas.paste(fg_scaled_art, (fg_offset, fg_offset), fg_scaled_art)
        fg_canvas.save(os.path.join(folder_path, 'ic_launcher_foreground.png'))

        print(f"Generated {folder}: ic_launcher ({legacy_size}x{legacy_size}), ic_launcher_round ({legacy_size}x{legacy_size}), ic_launcher_foreground ({fg_size}x{fg_size})")

    print("\nALL ANDROID & WEB ICONS GENERATED SUCCESSFULLY!")

if __name__ == '__main__':
    generate_icons()
