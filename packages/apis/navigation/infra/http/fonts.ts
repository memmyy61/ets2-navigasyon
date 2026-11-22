import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'node:fs';
import path from 'node:path';

const upstream = 'https://fonts.openmaptiles.org';
const fontPathRegex = /^\/fonts\/([^/]+)\/(\d+-\d+)\.pbf$/;
const inFlight = new Map<string, Promise<Buffer | undefined>>();

/**
 * Serves map font glyphs from `<webDir>/fonts`. A glyph file that isn't on
 * disk yet is downloaded once from the public OpenMapTiles font server and
 * saved, so later requests (and phones on the local network) never need
 * internet access for it again.
 *
 * Returns `true` if the request was handled.
 */
export function serveFonts(
  webDir: string,
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  if (req.method !== 'GET') {
    return false;
  }
  let pathname: string;
  try {
    pathname = decodeURIComponent(
      new URL(req.url ?? '/', 'http://localhost').pathname,
    );
  } catch {
    return false;
  }
  const match = fontPathRegex.exec(pathname);
  if (!match) {
    return false;
  }
  const [, fontstack, range] = match;
  if (fontstack.includes('..') || fontstack.startsWith('.')) {
    return false;
  }

  const filePath = path.join(
    path.resolve(webDir),
    'fonts',
    fontstack,
    `${range}.pbf`,
  );
  if (fs.existsSync(filePath)) {
    sendPbf(res, fs.readFileSync(filePath));
    return true;
  }

  let download = inFlight.get(filePath);
  if (!download) {
    download = downloadGlyphs(fontstack, range, filePath).finally(() =>
      inFlight.delete(filePath),
    );
    inFlight.set(filePath, download);
  }
  void download.then(data => {
    if (data) {
      sendPbf(res, data);
    } else {
      res.writeHead(404);
      res.end();
    }
  });
  return true;
}

async function downloadGlyphs(
  fontstack: string,
  range: string,
  filePath: string,
): Promise<Buffer | undefined> {
  const url = `${upstream}/${encodeURI(fontstack)}/${range}.pbf`;
  try {
    const res = await fetch(url);
    if (!res.ok) {
      console.warn('font download failed', res.status, url);
      return undefined;
    }
    const data = Buffer.from(await res.arrayBuffer());
    fs.mkdirSync(path.dirname(filePath), { recursive: true });
    fs.writeFileSync(filePath, data);
    return data;
  } catch (e) {
    console.warn('font download failed (no internet?)', url, String(e));
    return undefined;
  }
}

function sendPbf(res: ServerResponse, data: Buffer) {
  res.writeHead(200, {
    'Content-Type': 'application/x-protobuf',
    'Content-Length': data.length,
    'Cache-Control': 'public, max-age=86400',
  });
  res.end(data);
}
