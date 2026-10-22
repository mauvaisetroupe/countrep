#!/usr/bin/env python3
"""
Exporte les icônes de CountRep à partir de icons/app-icon-foreground.svg.

Utilisation (depuis la racine du dépôt) :

    python3 icons/export-app-icons.py

Nécessite Inkscape (https://inkscape.org). Le binaire est cherché dans
$INKSCAPE, puis dans le PATH, puis à l'emplacement par défaut sous macOS.

Fichiers générés (frontend/public/icons, référencés par le manifest de la
PWA dans frontend/vite.config.ts et par frontend/index.html) :

- icon-192.png, icon-512.png         icône « any » : dessin agrandi sur le fond
- maskable-192.png, maskable-512.png icône adaptative Android : dessin dans la
                                     zone de sécurité, sur le fond
- monochrome-512.png                 icône à thème (Android 13+) : blanc sur
                                     transparent
- apple-touch-icon.png               icône iOS (180 x 180, opaque)
- favicon.svg, favicon-48.png        favicon

Application Android (frontend/android/app/src/main/res, ADR 0012) :

- mipmap-*/ic_launcher_foreground.png  premier plan de l'icône adaptative
                                     (108 dp), aussi utilisé comme icône
                                     monochrome et icône de l'écran de
                                     démarrage (mipmap-anydpi-v26/*.xml,
                                     values/styles.xml)
- mipmap-*/ic_launcher.png,
  ic_launcher_round.png              icônes des Android < 8 (48 dp), carré
                                     arrondi et rond
- values/ic_launcher_background.xml  couleur de fond de l'icône et de
                                     l'écran de démarrage

Et hors de l'application (icons/) :

- playstore-icon.png                 icône de la fiche Google Play
                                     (512 x 512, opaque)

Garder BACKGROUND en phase avec la couleur primaire (frontend/src/style.css)
et le background_color du manifest (écran de démarrage).
"""

import os
import re
import shutil
import subprocess
import sys
import tempfile
from pathlib import Path

BACKGROUND = '#1389FC'

# Agrandissement du dessin dans les icônes jamais découpées par un lanceur
# (icon-*, apple-touch-icon, favicon) : pas besoin de la marge de la zone
# de sécurité.
ICON_ZOOM = 1.4

# Le premier plan d'une icône adaptative Android fait 108 dp, dont le
# lanceur ne montre que les 72 dp centraux : réduit d'autant, le dessin
# occupe la même part de l'icône visible que dans maskable-*.png.
ADAPTIVE_ZOOM = 72 / 108

# Facteurs d'échelle des densités Android (mdpi = 1 px par dp)
DENSITIES = {'mdpi': 1, 'hdpi': 1.5, 'xhdpi': 2, 'xxhdpi': 3, 'xxxhdpi': 4}

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'icons' / 'app-icon-foreground.svg'
OUTPUT = ROOT / 'frontend' / 'public' / 'icons'
ANDROID_RES = ROOT / 'frontend' / 'android' / 'app' / 'src' / 'main' / 'res'
STORE_OUTPUT = ROOT / 'icons'


def find_inkscape():
    candidates = [
        os.environ.get('INKSCAPE'),
        shutil.which('inkscape'),
        '/Applications/Inkscape.app/Contents/MacOS/inkscape',
    ]

    for candidate in candidates:
        if candidate and Path(candidate).exists():
            return candidate

    sys.exit('Inkscape introuvable : l\'installer ou définir $INKSCAPE.')


def export(inkscape, svg_path, png_path, width, opaque=False):
    command = [
        inkscape,
        str(svg_path),
        '--export-type=png',
        f'--export-filename={png_path}',
        f'--export-width={width}',
    ]

    if opaque:
        # Aucun canal alpha (icônes de magasin d'applications, iOS)
        command.append('--export-png-color-mode=RGB_8')

    subprocess.run(command, check=True, capture_output=True)
    print(f'  {png_path.relative_to(ROOT)}')


def with_background(svg, zoom=1.0):
    """
    Renvoie le SVG avec un rectangle de fond sur tout le canevas, le dessin
    agrandi de `zoom` autour du centre.
    """
    opening = (
        f'<rect width="1024" height="1024" fill="{BACKGROUND}"/>'
        f'<g transform="translate(512,512) scale({zoom}) translate(-512,-512)">'
    )
    svg = re.sub(r'(<svg\b[^>]*>)', lambda m: m.group(1) + opening, svg, count=1)
    return svg.replace('</svg>', '</g></svg>')


def zoomed(svg, zoom):
    """Renvoie le SVG, dessin agrandi de `zoom` autour du centre, sans fond."""
    opening = f'<g transform="translate(512,512) scale({zoom}) translate(-512,-512)">'
    svg = re.sub(r'(<svg\b[^>]*>)', lambda m: m.group(1) + opening, svg, count=1)
    return svg.replace('</svg>', '</g></svg>')


def clipped(svg, shape):
    """Renvoie le SVG découpé par `shape` (élément SVG sur le canevas 1024)."""
    opening = (
        f'<defs><clipPath id="launcher-shape">{shape}</clipPath></defs>'
        '<g clip-path="url(#launcher-shape)">'
    )
    svg = re.sub(r'(<svg\b[^>]*>)', lambda m: m.group(1) + opening, svg, count=1)
    return svg.replace('</svg>', '</g></svg>')


def export_android(inkscape, source, maskable, tmp):
    foreground_svg = tmp / 'android-foreground.svg'
    foreground_svg.write_text(zoomed(source, ADAPTIVE_ZOOM))

    legacy_svg = tmp / 'android-legacy.svg'
    legacy_svg.write_text(clipped(maskable, '<rect width="1024" height="1024" rx="180"/>'))

    round_svg = tmp / 'android-round.svg'
    round_svg.write_text(clipped(maskable, '<circle cx="512" cy="512" r="512"/>'))

    for density, scale in DENSITIES.items():
        folder = ANDROID_RES / f'mipmap-{density}'
        export(inkscape, foreground_svg, folder / 'ic_launcher_foreground.png', round(108 * scale))
        export(inkscape, legacy_svg, folder / 'ic_launcher.png', round(48 * scale))
        export(inkscape, round_svg, folder / 'ic_launcher_round.png', round(48 * scale))

    colors = ANDROID_RES / 'values' / 'ic_launcher_background.xml'
    colors.write_text(
        '<?xml version="1.0" encoding="utf-8"?>\n'
        '<!-- Généré par icons/export-app-icons.py -->\n'
        '<resources>\n'
        f'    <color name="ic_launcher_background">{BACKGROUND}</color>\n'
        '</resources>\n'
    )
    print(f'  {colors.relative_to(ROOT)}')


def main():
    inkscape = find_inkscape()
    source = SOURCE.read_text()
    OUTPUT.mkdir(parents=True, exist_ok=True)

    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)

        icon_svg = tmp / 'icon.svg'
        icon_svg.write_text(with_background(source, zoom=ICON_ZOOM))

        maskable_svg = tmp / 'maskable.svg'
        maskable_svg.write_text(with_background(source))

        print(f'Export depuis {SOURCE.relative_to(ROOT)} :')

        for size in (192, 512):
            export(inkscape, icon_svg, OUTPUT / f'icon-{size}.png', size)
            export(inkscape, maskable_svg, OUTPUT / f'maskable-{size}.png', size)

        # Le dessin est déjà blanc sur transparent : Android n'utilise que
        # le canal alpha de l'icône monochrome.
        export(inkscape, SOURCE, OUTPUT / 'monochrome-512.png', 512)
        export(inkscape, icon_svg, OUTPUT / 'apple-touch-icon.png', 180, opaque=True)
        export(inkscape, icon_svg, OUTPUT / 'favicon-48.png', 48)

        # Favicon vectoriel : le SVG d'icône lui-même, avec son fond
        favicon = OUTPUT / 'favicon.svg'
        favicon.write_text(icon_svg.read_text())
        print(f'  {favicon.relative_to(ROOT)}')

        export(inkscape, icon_svg, STORE_OUTPUT / 'playstore-icon.png', 512, opaque=True)

        export_android(inkscape, source, maskable_svg.read_text(), tmp)


if __name__ == '__main__':
    main()
