const appJson = require('./app.json');

/** @type {import('expo/config').ExpoConfig} */
module.exports = () => ({
  ...appJson,
  expo: {
    ...appJson.expo,
    plugins: [
      ...(appJson.expo.plugins ?? []),
      [
        'expo-notifications',
        {
          icon: './assets/images/icon.png',
          color: '#8770C6',
        },
      ],
      '@react-native-community/datetimepicker',
    ],
    extra: {
      supabaseUrl: process.env.EXPO_PUBLIC_SUPABASE_URL,
      supabasePublishableKey: process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    },
  },
});
