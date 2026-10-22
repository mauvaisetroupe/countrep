import type { CapacitorConfig } from '@capacitor/cli'

// Application Android (ADR 0012) : le build `vite build --mode android`
// (dist/) est embarqué dans l'application, servie depuis https://localhost.
const config: CapacitorConfig = {
  appId: 'lu.architech.countrep',
  appName: 'CountRep',
  webDir: 'dist'
}

export default config
