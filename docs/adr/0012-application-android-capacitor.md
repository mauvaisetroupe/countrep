# 12. Application Android avec Capacitor

- Statut : Accepté, remplacé en partie par [ADR 0015](0015-pwa-conservee-pour-le-site-web.md) (point 3)
- Date : 2026-10-11

## Contexte

CountRep doit être publié sur Google Play. L'interface Vue suit le style de Step Challenge (ADR 0010) ; calendrier, glisser-déposer et fenêtres se comportent bien sur téléphone.

Cet ADR ne traite que du **client** : comment l'application Vue devient une application Android. Le backend de synchronisation relève de l'[ADR 0005](0005-backend-de-synchronisation.md), et la connexion de l'[ADR 0013](0013-connexion-par-compte-google.md).

Options étudiées :

| | TWA (Trusted Web Activity) | Capacitor | Expo / React Native | PWA seule |
|---|---|---|---|---|
| Principe | La PWA ouverte par Chrome, en plein écran | Le code Vue dans une application native (WebView) | Réécriture de l'interface | Sans Store |
| Mise en place | Faible | Moyenne (quelques jours) | Élevée | Aucune |
| Mises à jour | Instantanées (déploiement web) | Par le Store | Par le Store (ou EAS Update) | Instantanées |
| Natif (notifications locales, widget, Health Connect) | Non | Oui (plugins) | Oui | Non |
| Dépendance à Chrome | Oui | Non | Non | Navigateur |
| iOS | Non | Oui | Oui | Limité |

- **Expo** est écarté : il apporterait des composants natifs, mais les composants Vue suffisent ici, et une technologie commune aux deux applications de l'auteur n'est plus un argument quand l'IA écrit l'essentiel du code. Le coût d'une réécriture ne se justifie pas.
- **La TWA** est la plus économique, mais n'ouvre pas la porte aux fonctionnalités natives : des rappels dans la journée fiables hors ligne (le cœur du « Grease the Groove »), un widget, Health Connect. Elle n'existe pas sur iOS.

## Décision

1. **Client Android** : l'application Vue actuelle, embarquée avec **Capacitor**. Package `lu.architech.countrep`.
2. **Projet Android versionné** : `frontend/android/` est créé une fois par Capacitor, puis modifié directement (permissions, icônes, nom) ; `npx cap sync` y copie le build web et la configuration des plugins sans le régénérer. Contrairement à Expo, il est donc versionné ; les fichiers générés au build restent ignorés. Le build livré est un `.aab` signé, avec Play App Signing ; les clés ne sont jamais versionnées.
3. **Plus de PWA** : service worker, installation et invite de mise à jour sont retirés. Dans l'application, les fichiers web sont embarqués : elle démarre hors ligne sans service worker.
4. **Le site web reste**, sans PWA, construit à partir du même code : développement dans le navigateur, accès depuis un ordinateur ou un téléphone non Android.
5. **Fonctions natives par des plugins Capacitor**, de préférence ceux qui ont aussi une implémentation web : le même appel fonctionne dans le navigateur et dans l'application.
6. **Développement** : dans le navigateur (`npm run dev`) pour l'essentiel ; sur le téléphone ou l'émulateur avec la *live reload* de Capacitor pour le natif ; débogage avec `chrome://inspect`.
7. **Mises à jour** : chaque changement du frontend passe par une version sur le Store. Un service de mise à jour à chaud (Capgo, Capawesome…) n'est pas retenu pour l'instant.
8. **Icônes et écran de démarrage Android** (icône adaptative, monochrome, écran de démarrage) générés par le script d'export, à partir du SVG maître (ADR 0010).

## Conséquences

- Les fonctionnalités natives deviennent possibles, à commencer par des rappels locaux ; iOS reste envisageable avec le même code.
- **Les livraisons ralentissent** : plus de correctif en production dans la minute, et plusieurs versions de l'application cohabitent plus longtemps chez les utilisateurs.
- L'application tourne depuis une origine locale (`https://localhost`), pas depuis `countrep.architech.lu`. Les passkeys actuelles (WebAuthn) ne fonctionnent pas dans cette WebView, et la connexion Google web y est refusée : la connexion passe par un compte Google avec un plugin web et natif ([ADR 0013](0013-connexion-par-compte-google.md)).
- Une distribution hors Google Play (AppGallery de Huawei, APK) reste possible.
- Le backend de synchronisation (le nôtre ou Google Drive) reste à choisir dans l'ADR 0005.
