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

ROOT = Path(__file__).resolve().parent.parent
SOURCE = ROOT / 'icons' / 'app-icon-foreground.svg'
OUTPUT = ROOT / 'frontend' / 'public' / 'icons'
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


if __name__ == '__main__':
    main()
