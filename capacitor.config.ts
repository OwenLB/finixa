import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.finixa.app',
  appName: 'Finixa',
  webDir: '.output/public',

  ios: {
    contentInset: 'never',
    allowsLinkPreview: false,
    scrollEnabled: true,
  },

  plugins: {
    Keyboard: {
      resize: 'body',
      resizeOnFullScreen: true,
    },
  },
};

export default config;
