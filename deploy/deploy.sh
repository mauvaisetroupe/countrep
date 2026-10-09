#!/bin/bash
# Déploiement de CountRep sur le LXC de production (voir docs/deployment.md).
# Usage : /opt/countrep/deploy/deploy.sh

set -euo pipefail

APP_DIR="/opt/countrep"

# Tout le script est dans une fonction appelée à la fin : bash le lit
# donc en entier avant de l'exécuter, et le git pull peut mettre à jour
# ce fichier sans perturber l'exécution en cours.
main() {
  echo "======================================"
  echo " CountRep - Déploiement"
  echo "======================================"

  cd "$APP_DIR"

  echo
  echo "▶ Git pull"
  git pull --ff-only

  echo
  echo "▶ Backend : installation des dépendances"
  cd "$APP_DIR/backend"
  # npm ci installe exactement package-lock.json sans le réécrire,
  # le working tree reste propre pour le prochain git pull
  npm ci --no-audit

  echo
  echo "▶ Backend : build"
  npm run build

  echo
  echo "▶ Frontend : installation des dépendances"
  cd "$APP_DIR/frontend"
  npm ci --no-audit

  echo
  echo "▶ Frontend : build"
  # Build dans un dossier à part : Nginx continue de servir dist/
  # pendant le build, et rien n'est remplacé si le build échoue
  rm -rf dist-next
  npm run build -- --outDir dist-next

  echo
  echo "▶ Redémarrage du backend"
  systemctl restart countrep-api

  echo
  echo "▶ Attente du démarrage du backend"

  for i in {1..20}; do
    if curl -fsS http://127.0.0.1:3000/api/health >/dev/null 2>&1; then
      echo "Backend disponible ✓"
      break
    fi

    if [ "$i" -eq 20 ]; then
      echo "ERREUR : le backend ne répond pas après 20 secondes"
      echo "Le frontend n'a pas été remplacé."
      systemctl status countrep-api --no-pager -l
      exit 1
    fi

    sleep 1
  done

  echo
  echo "▶ Frontend : mise en ligne"
  rm -rf dist-prev
  if [ -d dist ]; then
    mv dist dist-prev
  fi
  mv dist-next dist
  rm -rf dist-prev

  echo
  echo "▶ Rechargement de Nginx"
  systemctl reload nginx

  echo
  echo "▶ Vérification du backend"
  curl -fsS http://127.0.0.1:3000/api/health

  echo
  echo
  echo "▶ Vérification via Nginx"
  curl -fsS http://127.0.0.1/api/health

  echo
  echo
  echo "======================================"
  echo " Déploiement terminé avec succès ✓"
  echo "======================================"
}

main "$@"
