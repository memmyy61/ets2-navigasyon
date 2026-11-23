import type { IncomingMessage, ServerResponse } from 'http';
import path from 'node:path';
import { env } from '../../env';
import type { Services } from '../services';
import { serveFonts } from './fonts';
import { serveStatic } from './static';

/**
 * WEB_DIR may list several dirs separated by the platform's path delimiter
 * (";" on Windows, ":" elsewhere), e.g. the bundled phone app and a
 * separate map data dir. Files are looked up in order; downloaded map fonts
 * are stored in the last dir.
 */
function serveWebDirs(
  webDirs: string,
  req: Parameters<typeof serveStatic>[1],
  res: Parameters<typeof serveStatic>[2],
): boolean {
  const dirs = webDirs.split(path.delimiter).filter(d => d !== '');
  if (dirs.length === 0) {
    return false;
  }
  if (serveFonts(dirs[dirs.length - 1], req, res)) {
    return true;
  }
  return dirs.some(dir => serveStatic(dir, req, res));
}

export function createHttpHandler({ services }: { services: Services }) {
  return (req: IncomingMessage, res: ServerResponse) => {
    if (req.url === '/health') {
      res.writeHead(200);
      res.end('ok');
      return;
    }

    if (req.url === '/metrics' && env.METRICS_ENABLED) {
      const authHeader = req.headers.authorization;
      if (authHeader === `Bearer ${env.METRICS_COLLECTOR_BEARER_TOKEN}`) {
        res.writeHead(200);
        void services.metrics.render().then(metrics => res.end(metrics));
        return;
      }
      res.writeHead(403);
      res.end();
      return;
    }

    if (env.WEB_DIR && serveWebDirs(env.WEB_DIR, req, res)) {
      return;
    }

    // Everything else: 404
    res.writeHead(404);
    res.end();
  };
}
