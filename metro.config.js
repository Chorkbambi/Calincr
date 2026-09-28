// Learn more https://docs.expo.dev/guides/customizing-metro
const { getDefaultConfig } = require('expo/metro-config');

const config = getDefaultConfig(__dirname);

// Bundled MediaPipe files (camera rep counting runs fully on the phone).
config.resolver.assetExts.push('wasm', 'task', 'bin');

module.exports = config;
