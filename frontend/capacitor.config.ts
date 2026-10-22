import type { CapacitorConfig } from '@capacitor/cli'

// Application Android (ADR 0012) : le build `vite build --mode android`
// (dist/) est embarqué dans l'application, servie depuis https://localhost.
const config: CapacitorConfig = {
  appId: 'lu.architech.countrep',
  appName: 'CountRep',
  webDir: 'dist',
  plugins: {
    // Connexion Google uniquement (ADR 0013) : les autres fournisseurs ne
    // sont pas embarqués. Sans `facebook: false`, le SDK Facebook serait
    // dans l'application (et à déclarer dans « Sécurité des données »).
    SocialLogin: {
      providers: {
        google: true,
        facebook: false,
        apple: false,
        twitter: false
      }
    }
  }
}

export default config
