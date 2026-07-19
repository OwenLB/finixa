// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  compatibilityDate: '2025-07-15',
  ssr: false,
  devtools: { enabled: true },
  modules: ['@pinia/nuxt', '@nuxtjs/supabase', '@nuxtjs/i18n'],

  typescript: {
    tsConfig: {
      compilerOptions: {
        // Strict mode complet conservé ; ce flag seul est désactivé car les
        // accès indexés (split('-')[0], tableaux) généraient ~50 faux positifs
        noUncheckedIndexedAccess: false,
      },
    },
  },

  i18n: {
    locales: [
      { code: 'fr', language: 'fr-FR', name: 'Français' },
      { code: 'en', language: 'en-US', name: 'English'  },
    ],
    defaultLocale: 'fr',
    strategy:      'no_prefix',
  },

  supabase: {
    types: '~/types/database.types',
    redirectOptions: {
      login: '/login',
      callback: '/confirm',
      exclude: ['/login', '/register', '/onboarding', '/forgot-password', '/reset-password'],
    },
    cookieOptions: {
      maxAge: 60 * 60 * 24 * 30, // 30 jours
      sameSite: 'lax',
      secure: false, // Capacitor uses capacitor:// scheme, not HTTPS — secure cookies are never restored
    },
    clientOptions: {
      auth: {
        persistSession:     true,
        storageKey:         'finixa-auth',
        autoRefreshToken:   true,
        detectSessionInUrl: false, // hash router — pas de session dans l'URL
      },
    },
  },

  css: ['~/assets/scss/main.scss'],

  router: {
    options: {
      hashMode: true,
    },
  },

  app: {
    head: {
      htmlAttrs: { lang: 'fr', 'data-theme': 'dark' },
      link: [
        // Anticipe la négociation DNS+TLS vers Supabase (gain ~100-300 ms sur
        // le premier fetch mobile)
        ...(process.env.SUPABASE_URL ? [{ rel: 'preconnect', href: process.env.SUPABASE_URL, crossorigin: '' as const }] : []),
        { rel: 'icon', type: 'image/x-icon', href: '/favicon.ico' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32-light.png', media: '(prefers-color-scheme: dark)' },
        { rel: 'icon', type: 'image/png', sizes: '32x32', href: '/favicon-32-dark.png', media: '(prefers-color-scheme: light)' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16-light.png', media: '(prefers-color-scheme: dark)' },
        { rel: 'icon', type: 'image/png', sizes: '16x16', href: '/favicon-16-dark.png', media: '(prefers-color-scheme: light)' },
        { rel: 'apple-touch-icon', sizes: '180x180', href: '/apple-touch-icon.png' },
        { rel: 'manifest', href: '/manifest.json' },
      ],
      meta: [
        { name: 'viewport', content: 'width=device-width, initial-scale=1, viewport-fit=cover' },
        { name: 'color-scheme', content: 'dark' },
        { name: 'theme-color', content: '#141414' },
        { name: 'mobile-web-app-capable', content: 'yes' },
      ],
    },
  },

  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          // Injecte les tokens SCSS dans chaque composant automatiquement
          additionalData: `@use "~/assets/scss/tokens" as *;`,
        },
      },
    },
  },
})
