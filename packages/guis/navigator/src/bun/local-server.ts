// ETS2 Navigasyon: runs the navigation server inside the desktop app, and
// manages its map data (imported once from the Ubuntu/WSL `out` folder).

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import type { ImportProgress, ServerState } from './types';

export const PORT = 62840;

/** where map data lives: %LOCALAPPDATA%\ETS2Navigasyon\veri */
export const dataDir = path.join(
  process.env.LOCALAPPDATA ?? path.join(os.homedir(), '.local', 'share'),
  'ETS2Navigasyon',
  'veri',
);
const dataWebDir = path.join(dataDir, 'web');

/** the phone app, bundled with the desktop app (see electrobun.config.ts). */
function bundledPhoneAppDir(): string {
  // Electrobun runs the main process from `<app>/bin`; bundled files are in
  // `<app>/Resources/app/<copy destination>`.
  return path.resolve('../Resources/app/telefon');
}

/** files the server needs; [file, subdir of the WSL `out` folder to look in] */
const navigationZip = 'europe-navigation.zip';
const webDataFiles = [
  'world.pmtiles',
  'ets2.pmtiles',
  'ets2-footprints.pmtiles',
  'sprites.png',
  'sprites.json',
  'sprites@2x.png',
  'sprites@2x.json',
  'ets2-villages.geojson',
];

export function hasData(): boolean {
  return (
    fs.existsSync(path.join(dataDir, navigationZip)) &&
    webDataFiles.every(f => fs.existsSync(path.join(dataWebDir, f)))
  );
}

/**
 * Looks for `~/ets2-navigasyon/out` folders in WSL distros that contain
 * generated data. Returns Windows (UNC) paths.
 */
export function findWslDataSources(): string[] {
  if (process.platform !== 'win32') {
    return [];
  }
  const distros = listWslDistros();
  const sources: string[] = [];
  for (const root of ['\\\\wsl.localhost', '\\\\wsl$']) {
    for (const distro of distros) {
      const home = `${root}\\${distro}\\home`;
      let users: string[] = [];
      try {
        users = fs.readdirSync(home);
      } catch {
        continue;
      }
      for (const user of users) {
        const out = `${home}\\${user}\\ets2-navigasyon\\out`;
        if (isDataSource(out)) {
          sources.push(out);
        }
      }
    }
    if (sources.length) {
      break;
    }
  }
  return sources;
}

function listWslDistros(): string[] {
  try {
    const res = spawnSync('wsl.exe', ['-l', '-q'], { timeout: 15_000 });
    // wsl.exe writes UTF-16LE
    return res.stdout
      .toString('utf16le')
      .split(/\r?\n/)
      .map(s => s.replace(/\0/g, '').trim())
      .filter(s => s !== '');
  } catch {
    return [];
  }
}

function webFileSource(outDir: string, file: string): string | undefined {
  for (const dir of [path.join(outDir, 'web'), outDir]) {
    const p = path.join(dir, file);
    if (fs.existsSync(p)) {
      return p;
    }
  }
  return undefined;
}

export function isDataSource(outDir: string): boolean {
  try {
    return (
      fs.existsSync(path.join(outDir, navigationZip)) &&
      webDataFiles.every(f => webFileSource(outDir, f) != null)
    );
  } catch {
    return false;
  }
}

/** copies map data from a WSL `out` folder into `dataDir`. */
export async function importData(
  outDir: string,
  onProgress: (p: ImportProgress) => void,
): Promise<void> {
  const files: { from: string; to: string }[] = [
    {
      from: path.join(outDir, navigationZip),
      to: path.join(dataDir, navigationZip),
    },
    ...webDataFiles.map(f => ({
      from: webFileSource(outDir, f)!,
      to: path.join(dataWebDir, f),
    })),
  ];
  // previously downloaded map fonts, if any
  const fontsDir = path.join(outDir, 'web', 'fonts');
  if (fs.existsSync(fontsDir)) {
    for (const f of walk(fontsDir)) {
      files.push({
        from: f,
        to: path.join(dataWebDir, 'fonts', path.relative(fontsDir, f)),
      });
    }
  }

  const totalBytes = files.reduce(
    (acc, f) => acc + fs.statSync(f.from).size,
    0,
  );
  let copiedBytes = 0;
  for (const { from, to } of files) {
    fs.mkdirSync(path.dirname(to), { recursive: true });
    const tmp = to + '.kopyalaniyor';
    await new Promise<void>((resolve, reject) => {
      const rs = fs.createReadStream(from);
      const ws = fs.createWriteStream(tmp);
      let lastReport = 0;
      rs.on('data', chunk => {
        copiedBytes += chunk.length;
        const now = Date.now();
        if (now - lastReport > 250) {
          lastReport = now;
          onProgress({ copiedBytes, totalBytes, file: path.basename(from) });
        }
      });
      rs.on('error', reject);
      ws.on('error', reject);
      ws.on('finish', resolve);
      rs.pipe(ws);
    });
    fs.renameSync(tmp, to);
  }
  onProgress({ copiedBytes: totalBytes, totalBytes, file: '' });
}

function* walk(dir: string): Generator<string> {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walk(p);
    } else {
      yield p;
    }
  }
}

let serverStarted = false;

/** starts the navigation server in this process (once). */
export async function startLocalServer(): Promise<void> {
  if (serverStarted) {
    return;
  }
  // configure the server before importing it (env is read at import time).
  Object.assign(process.env, {
    NODE_ENV: 'production',
    PORT: String(PORT),
    WEB_DIR: [bundledPhoneAppDir(), dataWebDir].join(path.delimiter),
    ALLOW_SAME_ORIGIN: 'true',
    RATE_LIMIT_ENABLED: 'false',
    // Bun: run routing/search in this process (see infra/workers/pool.ts)
    WORKER_THREADS: '0',
    LOG_LEVEL: 'warn',
  });
  const { startServer } = await import('@truckermudgeon/navigation/server');
  await startServer(dataDir);
  serverStarted = true;
}

/** phone URLs for this PC's local network addresses, most likely first. */
export function getPhoneUrls(): string[] {
  const virtualAdapter =
    /vethernet|virtualbox|vmware|hyper-v|wsl|loopback|bluetooth|tailscale|zerotier|hamachi|vpn|docker|default switch/i;
  const candidates: { url: string; score: number }[] = [];
  for (const [adapter, infos] of Object.entries(os.networkInterfaces())) {
    for (const info of infos ?? []) {
      if (
        info.family !== 'IPv4' ||
        info.internal ||
        info.address.startsWith('169.254.')
      ) {
        continue;
      }
      let score = virtualAdapter.test(adapter) ? 100 : 0;
      if (/wi-?fi|wlan|wireless|kablosuz/i.test(adapter)) {
        score -= 10;
      }
      candidates.push({ url: `http://${info.address}:${PORT}`, score });
    }
  }
  return candidates.sort((a, b) => a.score - b.score).map(c => c.url);
}

export function serverStateFor(
  state: ServerState['state'],
  message?: string,
): ServerState {
  return {
    state,
    message,
    phoneUrls: state === 'ready' ? getPhoneUrls() : [],
    dataSources: state === 'noData' ? findWslDataSources() : [],
    dataDir,
  };
}
