/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

declare const __GIT_HASH__: string

interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  readonly VITE_DEV_NO_AUTH?: string
}

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<{}, {}, any>
  export default component
}