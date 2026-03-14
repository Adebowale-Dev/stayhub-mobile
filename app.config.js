const packageJson = require('./package.json');
const apiBaseUrl = process.env.API_BASE_URL || 'http://172.20.10.3:5000/api';
const paystackPublicKey = process.env.PAYSTACK_PUBLIC_KEY || 'pk_test_f5ab1691491857e39c3ca1221d7e8d5680317b13';
const easProjectId = process.env.EXPO_EAS_PROJECT_ID ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    process.env.EAS_PROJECT_ID ||
    '';
module.exports = {
    expo: {
        name: 'StayHub',
        slug: 'stayhub-mobile',
        version: packageJson.version || '1.0.0',
        orientation: 'portrait',
        icon: './assets/icon.png',
        userInterfaceStyle: 'light',
        splash: {
            image: './assets/splash.png',
            resizeMode: 'contain',
            backgroundColor: '#1565C0',
        },
        assetBundlePatterns: ['**/*'],
        ios: {
            supportsTablet: false,
            bundleIdentifier: 'com.stayhub.mobile',
        },
        android: {
            adaptiveIcon: {
                foregroundImage: './assets/adaptive-icon.png',
                backgroundColor: '#1565C0',
            },
            package: 'com.stayhub.mobile',
        },
        web: {
            bundler: 'metro',
            output: 'static',
            favicon: './assets/favicon.png',
        },
        plugins: ['expo-router', 'expo-notifications'],
        experiments: {
            typedRoutes: true,
        },
        scheme: 'stayhub',
        extra: {
            apiBaseUrl,
            paystackPublicKey,
            eas: {
                projectId: easProjectId,
            },
        },
    },
};
