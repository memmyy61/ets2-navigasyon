import type {
  ApplicationMenuItemConfig,
  WindowOptionsType,
} from 'electrobun/bun';
import {
  ApplicationMenu,
  BrowserView,
  BrowserWindow,
  Updater,
  Utils,
} from 'electrobun/bun';
import { BrowserPageUrls } from './constants';
import {
  dataDir,
  hasData,
  importData,
  isDataSource,
  serverStateFor,
  startLocalServer,
} from './local-server';
import { startTelemetryClient } from './telemetry-client';
import type { ServerState, TelemetryGuiRPC, UpdateState } from './types';

const DEV_SERVER_PORT = 5174;
const DEV_SERVER_URL = `http://localhost:${DEV_SERVER_PORT}`;

async function getMainViewUrl(): Promise<string> {
  // Check if Vite dev server is running for HMR
  const channel = await Updater.localInfo.channel();
  if (channel === 'dev') {
    try {
      await fetch(DEV_SERVER_URL, { method: 'HEAD' });
      console.log(`HMR enabled: Using Vite dev server at ${DEV_SERVER_URL}`);
      return DEV_SERVER_URL;
    } catch {
      console.log(
        "Vite dev server not running. Run 'bun run dev:hmr' for HMR support.",
      );
    }
  }
  return 'views://mainview/index.html';
}

let telemetryClientStarted = false;

// ETS2 Navigasyon: local server lifecycle
let serverState: ServerState = serverStateFor(
  hasData() ? 'starting' : 'noData',
);
function setServerState(state: ServerState) {
  serverState = state;
  rpc.send('serverState', state);
}
async function bootServer() {
  setServerState(serverStateFor('starting'));
  try {
    await startLocalServer();
    setServerState(serverStateFor('ready'));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    const inUse = msg.includes('EADDRINUSE');
    setServerState(
      serverStateFor(
        'error',
        inUse
          ? "Port 62840 kullanımda. Ubuntu'daki eski sunucu (baslat.sh) veya " +
              'uygulamanın başka bir kopyası açık olabilir; kapatıp tekrar deneyin.'
          : msg,
      ),
    );
  }
}

// ETS2 Navigasyon: updates from GitHub releases
let updateState: UpdateState = { state: 'checking' };
function setUpdateState(state: UpdateState) {
  updateState = state;
  rpc.send('updateState', state);
}
async function checkForUpdates() {
  const channel = await Updater.localInfo.channel();
  if (channel === 'dev') {
    setUpdateState({ state: 'none' });
    return;
  }
  try {
    setUpdateState({ state: 'checking' });
    const info = await Updater.checkForUpdate();
    if (info.error) {
      setUpdateState({ state: 'error', message: info.error });
      return;
    }
    if (!info.updateAvailable) {
      setUpdateState({ state: 'none' });
      return;
    }
    setUpdateState({ state: 'downloading' });
    await Updater.downloadUpdate();
    if (Updater.updateInfo()?.updateReady) {
      setUpdateState({ state: 'ready' });
    } else {
      setUpdateState({
        state: 'error',
        message: Updater.updateInfo()?.error || 'güncelleme indirilemedi',
      });
    }
  } catch (e) {
    setUpdateState({
      state: 'error',
      message: e instanceof Error ? e.message : String(e),
    });
  }
}

const rpc = BrowserView.defineRPC<TelemetryGuiRPC>({
  maxRequestTime: 0,
  handlers: {
    requests: {
      startTelemetryClient: async () => {
        if (telemetryClientStarted) {
          return;
        }
        if (process.platform === 'win32') {
          // for some reason, Windows doesn't show the app's footer on initial
          // display, even when the browser window is constructed with a larger
          // `frame.height`. forcing a window resize seems to fix things.
          mainWindow.setSize(
            browserWindowOptions.frame.width,
            browserWindowOptions.frame.height + 60,
          );
        }
        telemetryClientStarted = true;
        await startTelemetryClient(rpc);
      },
      openBrowser: ({ page }) => {
        Utils.openExternal(BrowserPageUrls[page]);
      },
      getServerState: () => {
        // re-send update state too, in case the view missed it.
        setTimeout(() => rpc.send('updateState', updateState), 0);
        return serverState;
      },
      importData: async ({ source }) => {
        if (!isDataSource(source)) {
          setServerState(
            serverStateFor(
              'noData',
              `Bu klasörde harita verisi yok: ${source}`,
            ),
          );
          return;
        }
        setServerState({ ...serverStateFor('importing'), dataSources: [] });
        try {
          await importData(source, progress =>
            rpc.send('importProgress', progress),
          );
        } catch (e) {
          setServerState(
            serverStateFor(
              'noData',
              'Kopyalama başarısız: ' +
                (e instanceof Error ? e.message : String(e)),
            ),
          );
          return;
        }
        await bootServer();
      },
      applyUpdate: async () => {
        await Updater.applyUpdate();
      },
      openDataFolder: () => {
        Utils.openPath(dataDir);
      },
    },
  },
});

const browserWindowOptions = {
  title: 'ETS2 Navigasyon',
  url: await getMainViewUrl(),
  styleMask: {
    Resizable: false,
  },
  titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
  frame: {
    width: 720,
    height: 480,
    x: 200,
    y: 200,
  },
  rpc,
} as const satisfies Partial<WindowOptionsType<typeof rpc>>;

const applicationMenu: ApplicationMenuItemConfig[] = [];
switch (process.platform) {
  case 'darwin':
    applicationMenu.push({
      submenu: [
        // { label: 'Hide TruckSim Navigator', role: 'hide' },
        // { role: 'hideOthers' },
        // { role: 'showAll' },
        // { type: 'separator' },
        { label: "ETS2 Navigasyon'dan çık", role: 'quit', accelerator: 'q' },
      ],
    });
    break;
  case 'win32':
  default:
    applicationMenu.push({
      label: 'Dosya',
      submenu: [{ label: 'Çıkış', role: 'quit' }],
    });
    break;
}

// must be called _immediately before_ `BrowserWindow` ctor below.
// see https://github.com/blackboardsh/electrobun/issues/136#issuecomment-3993930745
ApplicationMenu.setApplicationMenu(applicationMenu);

const mainWindow = new BrowserWindow(browserWindowOptions);

// Quit the app when the main window is closed
mainWindow.on('close', () => {
  Utils.quit();
});

console.log('ETS2 Navigasyon started.');

if (serverState.state === 'starting') {
  void bootServer();
}
void checkForUpdates();
// check again every 30 minutes while the app is open
setInterval(() => {
  if (updateState.state === 'none' || updateState.state === 'error') {
    void checkForUpdates();
  }
}, 30 * 60_000);
