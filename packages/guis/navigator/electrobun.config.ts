import type { ElectrobunConfig } from 'electrobun';

export default {
  app: {
    name: 'ETS2 Navigasyon',
    identifier: 'com.memmyy61.ets2-navigasyon',
    // CI sets APP_VERSION (e.g. 0.1.<run number>)
    version: process.env.APP_VERSION ?? '0.1.0',
  },
  release: {
    // updates are published as GitHub release assets; Electrobun fetches
    // `<baseUrl>/stable-win-x64-update.json` etc.
    baseUrl:
      'https://github.com/memmyy61/ets2-navigasyon/releases/latest/download',
  },
  build: {
    // Vite builds to dist/, we copy from there
    copy: {
      'dist/index.html': 'views/mainview/index.html',
      'dist/assets': 'views/mainview/assets',
      // ETS2 Navigasyon: the phone app, served by the embedded server
      '../../apps/navigator/build': 'telefon',
    },
    bun: {
      define: {
        'process.env.NODE_ENV': JSON.stringify(
          process.env.NODE_ENV ?? 'development',
        ),
      },
    },
    mac: {
      bundleCEF: false,
      entitlements: {
        // This entitlement is required for Electrobun apps with a hardened runtime (required for notarization) to run on macos
        'com.apple.security.cs.allow-jit': true,
        // Required for bun runtime to work with dynamic code execution and JIT compilation when signed
        'com.apple.security.cs.allow-unsigned-executable-memory': true,
        //'com.apple.security.cs.disable-library-validation': true,
      },
    },
    linux: {
      bundleCEF: false,
      icon: 'icon.iconset/icon_256x256.png',
    },
    win: {
      bundleCEF: false,
      icon: 'icon.iconset/icon_256x256.png',
    },
  },
} satisfies ElectrobunConfig;
