import json
import subprocess
from pathlib import Path

API_KEY = "AQ.Ab8RN6I35HzjoXPujThHeDgPNbq38oMJwsbXn2oce8pIQsbAuQ"
PROJECT_ID = "1170701292085352991"
SCREENS = [
    ("dashboard", "491c3c60750d4490a6a48545d3a771c2"),
    ("heartpulse", "d1e7611e2566492cb237d762ba31e3d0"),
    ("soul-curhat", "1831a529823d4baeae752e457c651f33"),
    ("imanifest", "ff9fafe6a498485e855dd1b17c311f61"),
    ("dua-todo", "b2c8346545444150a59b7e742dd6aadc"),
    ("tafakkur", "1800775b22524ca6aaf8f3b49c41bf8a"),
]

project_root = Path("/Users/mentarirahman/Documents/Imanifestapp")
assets_dir = project_root / "apps/mobile-web/assets/stitch"
meta_dir = project_root / "apps/mobile-web/lib/stitch"
assets_dir.mkdir(parents=True, exist_ok=True)
meta_dir.mkdir(parents=True, exist_ok=True)

index = {}

for name, screen_id in SCREENS:
    meta_path = assets_dir / f"{name}.json"
    screen_url = f"https://stitch.googleapis.com/v1/projects/{PROJECT_ID}/screens/{screen_id}"
    subprocess.run([
        "curl", "-s", screen_url,
        "-H", f"X-Goog-Api-Key: {API_KEY}",
        "-o", str(meta_path),
    ], check=True)

    with open(meta_path, "r", encoding="utf-8") as f:
        payload = json.load(f)

    screenshot_url = payload.get("screenshot", {}).get("downloadUrl", "")
    html_url = payload.get("htmlCode", {}).get("downloadUrl", "")

    png_path = assets_dir / f"{name}.png"
    html_path = assets_dir / f"{name}.html"

    if screenshot_url:
        subprocess.run(["curl", "-sL", screenshot_url, "-o", str(png_path)], check=True)
    if html_url:
        subprocess.run(["curl", "-sL", html_url, "-o", str(html_path)], check=True)

    index[name] = {
        "id": screen_id,
        "title": payload.get("title", ""),
        "screenshotUrl": screenshot_url,
        "htmlUrl": html_url,
        "png": str(png_path.relative_to(project_root)),
        "html": str(html_path.relative_to(project_root)),
    }

with open(meta_dir / "stitch-screens.json", "w", encoding="utf-8") as f:
    json.dump(index, f, indent=2)

print("Downloaded screens:")
for key, value in index.items():
    print(f"- {key}: {value['title']}")
