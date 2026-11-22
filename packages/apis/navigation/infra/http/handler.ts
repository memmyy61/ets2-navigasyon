import type { IncomingMessage, ServerResponse } from 'http';
import { env } from '../../env';
import type { Services } from '../services';
import { serveFonts } from './fonts';
import { serveStatic } from './static';

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

    if (
      env.WEB_DIR &&
      (serveFonts(env.WEB_DIR, req, res) || serveStatic(env.WEB_DIR, req, res))
    ) {
      return;
    }

    // Everything else: 404
    res.writeHead(404);
    res.end();
  };
}
