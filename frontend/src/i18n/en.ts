// Textes de l'interface en anglais (ADR 0009) : mêmes clés que fr.ts
import type fr from './fr'

const messages: typeof fr = {
  "nav": {
    "log": "Log",
    "journal": "History",
    "stats": "Stats",
    "settings": "Settings"
  },
  "update": {
    "title": "New version available",
    "body": "A new version of CountRep is available.",
    "apply": "Update",
    "later": "Later"
  },
  "settings": {
    "build": "Build: {hash}",
    "exercises": {
      "title": "Daily exercises",
      "description": "Exercises for Exercise mode, throughout the day"
    },
    "workouts": {
      "title": "My workouts",
      "description": "Sequences of exercises over several rounds"
    },
    "language": {
      "title": "Language",
      "description": "French, English or phone language",
      "system": "System",
      "systemHint": "Phone language (currently: {language})",
      "fr": "Français",
      "en": "English"
    },
    "account": {
      "title": "Account and security",
      "description": "Session, devices, sign out"
    }
  },
  "workouts": {
    "loadError": "Could not load workouts",
    "intro": "A workout chains several exercises, each with its number of reps (or its duration), repeated over several rounds.",
    "loading": "Loading workouts...",
    "empty": "No workouts yet.",
    "new": "New workout"
  },
  "account": {
    "deviceAdded": "This device is now registered.",
    "deviceError": "Something went wrong while adding the device.",
    "decodeError": "Could not decode the JWT",
    "sessionActive": "Secure session active",
    "jwt": "Authenticated with a JWT",
    "addDeviceTitle": "Add this device",
    "addDeviceHint": "Register a new passkey to sign in to your account from this device.",
    "addDevice": "Add a sign-in method",
    "logout": "Sign out"
  },
  "common": {
    "wait": "Please wait...",
    "loading": "Loading...",
    "saving": "Saving...",
    "save": "Save",
    "close": "Close",
    "cancel": "Cancel",
    "confirm": "Confirm"
  },
  "session": {
    "otherAccountPending": "{n} entry from another account has not been synced and will be deleted from this device. Continue? | {n} entries from another account have not been synced and will be deleted from this device. Continue?",
    "logoutPending": "{n} entry could not be synced and will be lost if you sign out. Sign out anyway? | {n} entries could not be synced and will be lost if you sign out. Sign out anyway?",
    "logoutPreview": "A workout in progress has not been saved and will be lost if you sign out. Sign out anyway?",
    "abandonConfirm": "Abandon this workout? The rounds entered will be lost.",
    "none": "No workout defined.",
    "create": "Create a workout ›",
    "inProgress": "Workout in progress · {date}",
    "resume": "Resume ›",
    "offline": "Offline: last known version of your workouts.",
    "start": "Start workout",
    "minimize": "‹ Minimize",
    "lessRounds": "One round less",
    "moreRounds": "One round more",
    "addRounds": "Add the round | Add the round | Add {n} rounds",
    "abandon": "Abandon",
    "finish": "Finish workout"
  },
  "auth": {
    "registerChallenge": "Could not create the registration challenge",
    "registerFailed": "Registration failed.",
    "loginChallenge": "Could not create the sign-in challenge",
    "challenge": "Could not create the challenge.",
    "addDeviceFailed": "Adding the device failed."
  },
  "login": {
    "cancelled": "Sign-in cancelled.",
    "registerError": "Something went wrong during registration.",
    "loginError": "Something went wrong while signing in.",
    "title": "Sign in",
    "passkey": "Passkey security",
    "intro": "Enter your username to sign in or create a key.",
    "expired": "Your session has expired, please sign in again.",
    "pendingKept": "{n} pending entry is kept on this device and will be synced after signing in. | {n} pending entries are kept on this device and will be synced after signing in.",
    "username": "Username / Email",
    "signIn": "Sign in",
    "register": "Register (passkey)"
  },
  "exercises": {
    "loadError": "Could not load exercises",
    "saved": "Exercises saved.",
    "saveError": "Could not save exercises",
    "intro": "Choose up to {max} exercises to practise regularly. Drag them to set your priority order.",
    "setCount": "{n} entry | {n} entries",
    "remove": "Remove this exercise",
    "move": "Move this exercise",
    "dragHint": "↕ Drag exercises to change their order.",
    "noneSelected": "No exercise selected.",
    "addBelow": "Add your exercises below.",
    "add": "Add an exercise",
    "search": "Search for an exercise...",
    "loading": "Loading exercises...",
    "notFound": "No exercise found.",
    "guideTitle": "See the exercise on Lift Manual",
    "maxReached": "Maximum of {max} exercises selected."
  },
  "selector": {
    "all": "All exercises",
    "title": "Exercises"
  },
  "addReps": {
    "title": "Add {name}",
    "illustration": "Illustration of {name}",
    "time": "Time",
    "questionSeconds": "How many seconds of {name} did you hold?",
    "questionReps": "How many {name} did you do?",
    "seconds": "Seconds",
    "count": "Count",
    "placeholder": "Enter a number",
    "quick": "Quick add:"
  },
  "picker": {
    "lessSeconds": "Fewer seconds",
    "lessReps": "One rep less",
    "moreSeconds": "More seconds",
    "moreReps": "One rep more"
  },
  "calendar": {
    "previous": "Previous month",
    "next": "Next month",
    "today": "Today"
  },
  "today": {
    "modeExercise": "Exercise",
    "modeWorkout": "Workout"
  },
  "workoutCard": {
    "rounds": "{n} round | {n} rounds",
    "exercises": "{n} exercise | {n} exercises",
    "perRound": "{total} per round"
  },
  "preview": {
    "removeEntry": "Remove",
    "removeRoundConfirm": "Delete round {round}?",
    "continue": "Continue workout",
    "title": "Workout overview",
    "none": "No workout in progress.",
    "backHome": "Back to home ›",
    "round": "Round {round}",
    "removeRound": "Delete round",
    "reps": "Reps",
    "notDone": "not done",
    "empty": "No round entered.",
    "total": "Total",
    "invalid": "Fix the invalid values before saving.",
    "save": "Save workout",
    "abandon": "Abandon workout"
  },
  "editWorkout": {
    "saveError": "Could not save the workout",
    "deleteError": "Could not delete the workout",
    "notFound": "Workout not found.",
    "title": "Edit workout",
    "name": "Workout name",
    "namePlaceholder": "Home calisthenics",
    "exercisesHint": "In the order they follow each other, with the number of reps (or the duration) of each.",
    "repsOf": "Reps of {name}",
    "noExercise": "No exercise.",
    "rounds": "Number of rounds",
    "roundsHint": "How many times to go through all the exercises.",
    "inTotal": "{total} in total",
    "deleteConfirm": "Delete the workout “{name}”?",
    "delete": "Delete workout"
  },
  "journal": {
    "yesterday": "Yesterday",
    "strength": "Strength training",
    "deleteConfirm": "Delete {exercise} — {amount}?",
    "empty": "No training yet.",
    "copied": "Copied",
    "copyGarmin": "Copy for Garmin",
    "options": "Options",
    "edit": "Edit",
    "delete": "Delete"
  },
  "stats": {
    "last30": "Last 30 days",
    "week": "This week",
    "month": "This month",
    "year": "This year",
    "activeDays": "Active days",
    "average": "Average per active day",
    "longestStreak": "Longest streak",
    "days": "{n} day | {n} days",
    "totalAll": "Total for all exercises",
    "totalOf": "Total {exercise}"
  }
}

export default messages
