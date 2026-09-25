// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: ['@nuxt/eslint', '@vite-pwa/nuxt', 'nuxt-auth-utils'],

  // Private PWA: no SEO need, and a client-only app keeps offline caching simple (ARCHITECTURE D7).
  ssr: false,

  devtools: { enabled: true },

  app: {
    head: {
      htmlAttrs: { lang: 'fr' },
      title: 'Quêtes de la maison',
      titleTemplate: '%s · Maison',
      link: [
        { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
        { rel: 'apple-touch-icon', href: '/apple-touch-icon-180x180.png' },
      ],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'color-scheme', content: 'light' },
        { name: 'theme-color', content: '#fffdf7' },
      ],
    },
  },

  css: ['~/assets/styles/main.scss'],

  // Secrets come from environment variables only (repository is public, ARCHITECTURE §9).
  runtimeConfig: {
    /** NUXT_DATABASE_URL */
    databaseUrl: '',
    /** NUXT_ALLOWED_EMAILS: comma-separated Google accounts of the household. */
    allowedEmails: '',
    session: {
      // Long-lived: the app is private and must keep working offline between visits.
      maxAge: 60 * 60 * 24 * 90,
    },
  },

  routeRules: {
    '/**': {
      headers: {
        'Content-Security-Policy': [
          'default-src \'self\'',
          // Nuxt inlines its runtime config in the SPA shell.
          'script-src \'self\' \'unsafe-inline\'',
          'style-src \'self\' \'unsafe-inline\'',
          'img-src \'self\' data: https://*.googleusercontent.com',
          'font-src \'self\'',
          'connect-src \'self\'',
          'worker-src \'self\'',
          'manifest-src \'self\'',
          'frame-ancestors \'none\'',
          'base-uri \'self\'',
          'form-action \'self\'',
        ].join('; '),
        'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
        'X-Content-Type-Options': 'nosniff',
        'Referrer-Policy': 'strict-origin-when-cross-origin',
        'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
      },
    },
  },
  compatibilityDate: '2026-09-24',

  nitro: {
    // The SPA shell is prerendered so the service worker can precache it and serve it offline.
    prerender: { routes: ['/'] },
  },

  typescript: {
    strict: true,
  },

  eslint: {
    config: {
      stylistic: true,
    },
  },

  pwa: {
    strategies: 'injectManifest',
    srcDir: 'service-worker',
    filename: 'sw.ts',
    registerType: 'prompt',
    injectManifest: {
      globPatterns: ['**/*.{js,css,html,svg,png,woff2}'],
    },
    manifest: {
      name: 'Quêtes de la maison',
      short_name: 'Maison',
      description: 'Le ménage à deux, en mode jeu.',
      lang: 'fr',
      start_url: '/',
      scope: '/',
      display: 'standalone',
      orientation: 'portrait',
      background_color: '#d9f0ff',
      theme_color: '#fffdf7',
      icons: [
        { src: 'pwa-192x192.png', sizes: '192x192', type: 'image/png' },
        { src: 'pwa-512x512.png', sizes: '512x512', type: 'image/png' },
        { src: 'maskable-icon-512x512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
    },
    client: {
      installPrompt: true,
    },
    devOptions: {
      enabled: false,
    },
  },
})
