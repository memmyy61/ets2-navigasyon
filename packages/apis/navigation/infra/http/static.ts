import type { IncomingMessage, ServerResponse } from 'http';
import fs from 'node:fs';
import path from 'node:path';

const contentTypes: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.geojson': 'application/geo+json; charset=utf-8',
  '.webmanifest': 'application/manifest+json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.pbf': 'application/x-protobuf',
  '.pmtiles': 'application/octet-stream',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
};

/**
 * Serves files from `webDir`, with HTTP Range support (required by .pmtiles).
 * Unknown paths without a file extension fall back to `index.html`, so the
 * single-page app can handle them.
 *
 * Returns `true` if the request was handled.
 */
export function serveStatic(
  webDir: string,
  req: IncomingMessage,
  res: ServerResponse,
): boolean {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
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

  const root = path.resolve(webDir);
  let filePath = path.resolve(root, '.' + pathname);
  if (filePath !== root && !filePath.startsWith(root + path.sep)) {
    // path traversal attempt
    return false;
  }

  let stat = statOrUndefined(filePath);
  if (stat?.isDirectory()) {
    filePath = path.join(filePath, 'index.html');
    stat = statOrUndefined(filePath);
  }
  if (!stat && path.extname(pathname) === '') {
    // SPA fallback
    filePath = path.join(root, 'index.html');
    stat = statOrUndefined(filePath);
  }
  if (!stat?.isFile()) {
    return false;
  }

  const contentType =
    contentTypes[path.extname(filePath).toLowerCase()] ??
    'application/octet-stream';
  const isHtml = contentType.startsWith('text/html');
  const commonHeaders = {
    'Content-Type': contentType,
    'Accept-Ranges': 'bytes',
    // index.html must never be cached, so app updates show up right away.
    // Hashed assets and map files can be cached by the browser.
    'Cache-Control': isHtml ? 'no-cache' : 'public, max-age=3600',
  };

  const range = parseRange(req.headers.range, stat.size);
  if (range === 'invalid') {
    res.writeHead(416, { 'Content-Range': `bytes */${stat.size}` });
    res.end();
    return true;
  }

  if (range) {
    const { start, end } = range;
    res.writeHead(206, {
      ...commonHeaders,
      'Content-Range': `bytes ${start}-${end}/${stat.size}`,
      'Content-Length': end - start + 1,
    });
    if (req.method === 'HEAD') {
      res.end();
    } else {
      fs.createReadStream(filePath, { start, end }).pipe(res);
    }
    return true;
  }

  res.writeHead(200, { ...commonHeaders, 'Content-Length': stat.size });
  if (req.method === 'HEAD') {
    res.end();
  } else {
    fs.createReadStream(filePath).pipe(res);
  }
  return true;
}

function statOrUndefined(p: string): fs.Stats | undefined {
  try {
    return fs.statSync(p);
  } catch {
    return undefined;
  }
}

function parseRange(
  header: string | undefined,
  size: number,
): { start: number; end: number } | 'invalid' | undefined {
  if (!header) {
    return undefined;
  }
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match) {
    // multiple ranges or unknown units: ignore and send the whole file
    return undefined;
  }
  const [, startStr, endStr] = match;
  let start: number;
  let end: number;
  if (startStr === '' && endStr === '') {
    return 'invalid';
  } else if (startStr === '') {
    // suffix range: last N bytes
    const suffix = Number(endStr);
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(startStr);
    end = endStr === '' ? size - 1 : Math.min(Number(endStr), size - 1);
  }
  if (start > end || start >= size) {
    return 'invalid';
  }
  return { start, end };
}
