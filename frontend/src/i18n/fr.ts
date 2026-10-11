// Textes de l'interface en français (ADR 0009)
const messages = {
  "nav": {
    "log": "Saisie",
    "journal": "Journal",
    "stats": "Stats",
    "settings": "Réglages"
  },
  "update": {
    "title": "Nouvelle version disponible",
    "body": "Une nouvelle version de CountRep est disponible.",
    "apply": "Mettre à jour",
    "later": "Plus tard"
  },
  "settings": {
    "groups": {
      "training": "Entraînement",
      "general": "Général"
    },
    "build": "Build : {hash}",
    "exercises": {
      "title": "Exercices au quotidien",
      "description": "Les exercices du mode Exercice, au fil de la journée"
    },
    "workouts": {
      "title": "Mes séances",
      "description": "Enchaînements d’exercices sur plusieurs séries"
    },
    "appearance": {
      "title": "Apparence",
      "description": "Clair, sombre ou comme le téléphone",
      "system": "Système",
      "systemHint": "Suit le réglage du téléphone",
      "light": "Clair",
      "dark": "Sombre"
    },
    "language": {
      "title": "Langue",
      "description": "Français, anglais ou langue du téléphone",
      "system": "Système",
      "systemHint": "Langue du téléphone (actuellement : {language})",
      "fr": "Français",
      "en": "English"
    },
    "account": {
      "title": "Compte et sécurité",
      "description": "Session, appareils, déconnexion"
    }
  },
  "workouts": {
    "loadError": "Erreur lors du chargement des séances",
    "intro": "Une séance enchaîne plusieurs exercices, chacun avec son nombre de répétitions (ou sa durée), répétés sur plusieurs séries.",
    "loading": "Chargement des séances...",
    "empty": "Aucune séance pour l'instant.",
    "new": "Nouvelle séance"
  },
  "account": {
    "deviceAdded": "Cet appareil est maintenant enregistré.",
    "deviceError": "Une erreur est survenue lors de l'ajout de l'appareil.",
    "decodeError": "Impossible de décoder le JWT",
    "sessionActive": "Session sécurisée active",
    "jwt": "Authentifié par Jeton JWT",
    "addDeviceTitle": "Ajouter cet appareil",
    "addDeviceHint": "Enregistrez un nouveau Passkey pour pouvoir vous connecter à votre compte depuis cet appareil.",
    "addDevice": "Ajouter un moyen d’accès",
    "logout": "Se déconnecter"
  },
  "common": {
    "wait": "Patientez...",
    "loading": "Chargement...",
    "saving": "Enregistrement...",
    "save": "Enregistrer",
    "close": "Fermer",
    "cancel": "Annuler",
    "confirm": "Valider"
  },
  "session": {
    "editing": "Modification de la séance · {date}",
    "abandonEditConfirm": "Annuler les modifications de cette séance ? La séance enregistrée reste inchangée.",
    "otherAccountPending": "{n} saisie d'un autre compte n'a pas été synchronisée et sera supprimée de cet appareil. Continuer ? | {n} saisies d'un autre compte n'ont pas été synchronisées et seront supprimées de cet appareil. Continuer ?",
    "logoutPending": "{n} saisie n'a pas pu être synchronisée et sera perdue si tu te déconnectes. Se déconnecter quand même ? | {n} saisies n'ont pas pu être synchronisées et seront perdues si tu te déconnectes. Se déconnecter quand même ?",
    "logoutPreview": "Une séance en cours n'a pas été enregistrée et sera perdue si tu te déconnectes. Se déconnecter quand même ?",
    "abandonConfirm": "Abandonner cette séance ? Les séries saisies seront perdues.",
    "none": "Aucune séance définie.",
    "create": "Créer une séance ›",
    "inProgress": "Séance en cours · {date}",
    "resume": "Reprendre ›",
    "offline": "Hors ligne : dernière version connue des séances.",
    "start": "Démarrer la séance",
    "minimize": "‹ Réduire",
    "lessRounds": "Une série de moins",
    "moreRounds": "Une série de plus",
    "addRounds": "Ajouter la série | Ajouter la série | Ajouter {n} séries",
    "abandon": "Abandonner",
    "finish": "Terminer la séance"
  },
  "auth": {
    "registerChallenge": "Échec de la création du challenge d'enregistrement",
    "registerFailed": "L'enregistrement a échoué.",
    "loginChallenge": "Échec de la création du challenge de connexion",
    "challenge": "Échec de la création du challenge.",
    "addDeviceFailed": "L'ajout de l'appareil a échoué."
  },
  "login": {
    "cancelled": "Connexion annulée.",
    "registerError": "Une erreur est survenue lors de l'enregistrement.",
    "loginError": "Une erreur est survenue lors de la connexion.",
    "title": "Connexion",
    "passkey": "Sécurité Passkey",
    "intro": "Entrez votre identifiant pour vous connecter ou créer une clé.",
    "expired": "Ta session a expiré, reconnecte-toi.",
    "pendingKept": "{n} saisie en attente est conservée sur cet appareil et sera synchronisée après la connexion. | {n} saisies en attente sont conservées sur cet appareil et seront synchronisées après la connexion.",
    "username": "Identifiant / Email",
    "signIn": "Se connecter",
    "register": "S'enregistrer (Passkey)"
  },
  "exercises": {
    "loadError": "Erreur lors du chargement des exercices",
    "saved": "Exercices enregistrés.",
    "saveError": "Erreur lors de la sauvegarde des exercices",
    "intro": "Choisissez jusqu'à {max} exercices à pratiquer régulièrement. Faites-les glisser pour définir votre ordre de priorité.",
    "setCount": "{n} saisie | {n} saisies",
    "remove": "Retirer cet exercice",
    "move": "Déplacer cet exercice",
    "dragHint": "↕ Faites glisser les exercices pour modifier leur ordre.",
    "noneSelected": "Aucun exercice sélectionné.",
    "addBelow": "Ajoutez vos exercices ci-dessous.",
    "add": "Ajouter un exercice",
    "search": "Rechercher un exercice...",
    "loading": "Chargement des exercices...",
    "notFound": "Aucun exercice trouvé.",
    "guideTitle": "Voir l'exercice sur Lift Manual",
    "maxReached": "Maximum de {max} exercices sélectionnés."
  },
  "selector": {
    "all": "Tous les exercices",
    "title": "Exercices"
  },
  "addReps": {
    "title": "Ajouter {name}",
    "illustration": "Illustration de {name}",
    "time": "Heure",
    "questionSeconds": "Combien de secondes de {name} avez-vous tenu ?",
    "questionReps": "Combien de {name} avez-vous fait ?",
    "seconds": "Secondes",
    "count": "Nombre",
    "placeholder": "Entrez un nombre",
    "quick": "Ajout rapide :"
  },
  "picker": {
    "lessSeconds": "Moins de secondes",
    "lessReps": "Une répétition de moins",
    "moreSeconds": "Plus de secondes",
    "moreReps": "Une répétition de plus"
  },
  "calendar": {
    "previous": "Mois précédent",
    "next": "Mois suivant",
    "today": "Aujourd'hui"
  },
  "today": {
    "modeExercise": "Exercice",
    "modeWorkout": "Séance"
  },
  "workoutCard": {
    "rounds": "{n} série | {n} séries",
    "exercises": "{n} exercice | {n} exercices",
    "perRound": "{total} par série"
  },
  "preview": {
    "editTitle": "Modifier la séance",
    "saveEdit": "Enregistrer les modifications",
    "abandonEdit": "Annuler les modifications",
    "removeEntry": "Retirer",
    "removeRoundConfirm": "Supprimer la série {round} ?",
    "continue": "Continuer la séance",
    "title": "Aperçu de la séance",
    "none": "Aucune séance en cours.",
    "backHome": "Retour à l'accueil ›",
    "round": "Série {round}",
    "removeRound": "Supprimer la série",
    "reps": "Répétitions",
    "notDone": "non fait",
    "empty": "Aucune série saisie.",
    "total": "Total",
    "invalid": "Corrige les valeurs invalides avant d'enregistrer.",
    "save": "Enregistrer la séance",
    "abandon": "Abandonner la séance"
  },
  "editWorkout": {
    "saveError": "Erreur lors de l'enregistrement de la séance",
    "deleteError": "Erreur lors de la suppression de la séance",
    "notFound": "Séance introuvable.",
    "title": "Modifier la séance",
    "name": "Nom de la séance",
    "namePlaceholder": "Calisthénie maison",
    "exercisesHint": "Dans l'ordre où ils s'enchaînent, avec le nombre de répétitions (ou la durée) de chacun.",
    "repsOf": "Répétitions de {name}",
    "noExercise": "Aucun exercice.",
    "rounds": "Nombre de séries",
    "roundsHint": "Combien de fois enchaîner l'ensemble des exercices.",
    "inTotal": "{total} au total",
    "deleteConfirm": "Supprimer la séance « {name} » ?",
    "delete": "Supprimer la séance"
  },
  "journal": {
    "session": "Séance",
    "sessionInProgress": "Une séance est déjà en cours : termine-la ou abandonne-la avant d'en modifier une autre.",
    "yesterday": "Hier",
    "strength": "Musculation",
    "deleteConfirm": "Supprimer {exercise} — {amount} ?",
    "empty": "Aucun entraînement.",
    "copied": "Copié",
    "copyGarmin": "Copier pour Garmin",
    "options": "Options",
    "edit": "Modifier",
    "delete": "Supprimer"
  },
  "stats": {
    "activeDays": "Jours actifs",
    "average": "Moyenne par jour actif",
    "days": "{n} jour | {n} jours",
    "period": {
      "1d": "1j",
      "7d": "7j",
      "30d": "30j",
      "1y": "1a"
    },
    "currentStreak": "Série en cours",
    "record": "record : {days}",
    "chartEquivalent": "Tous les exercices, en minutes d'effort : 15 répétitions ou 30 s tenues valent une minute.",
    "byExercise": "Par exercice",
    "empty": "Aucune saisie sur cette période.",
    "regularity": "Régularité (16 semaines)",
    "less": "Moins",
    "more": "Plus",
    "entries": "Saisies",
    "previousDay": "Jour précédent",
    "nextDay": "Jour suivant"
  }
}

export default messages
