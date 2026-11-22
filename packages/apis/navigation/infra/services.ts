import { UnreachableError } from '@truckermudgeon/base/precon';
import fs from 'node:fs';
import path from 'node:path';
import type { RoutingService } from '../domain/actor/generate-routes';
import type { SearchService } from '../domain/actor/search';
import type { DomainEventSink } from '../domain/events';
import type { GameContext } from '../domain/game-context';
import type { LookupService } from '../domain/lookup-data';
import {
  SessionActorRegistryImpl,
  type SessionActorRegistry,
} from './actors/registry';
import type { KvStore } from './kv/store';
import { createCacheableKv } from './kv/store';
import { logger } from './logging/logger';
import { loadLookupData } from './lookups/loader';
import { LookupServiceImpl } from './lookups/service';
import type { MetricsService } from './metrics/service';
import { createMetricsService } from './metrics/service';
import type { RateLimitService } from './rate-limit/service';
import { createRateLimitService } from './rate-limit/service';
import { createRoutingService } from './routing/service';
import { createSearchService } from './search/service';

export interface Services {
  lookups: LookupService;
  domainEventSink: DomainEventSink;
  kv: KvStore;
  sessionActors: SessionActorRegistry;
  search: SearchService;
  routing: RoutingService;
  rateLimit: RateLimitService;
  metrics: MetricsService;
}

export function initServices(dataDir: string): Services {
  // Load only the maps whose navigation data exists in `dataDir`, so the
  // server can run with ETS2 data alone.
  const loadIfPresent = (map: 'usa' | 'europe') => {
    const zipPath = path.join(dataDir, `${map}-navigation.zip`);
    if (!fs.existsSync(zipPath)) {
      logger.info(`${zipPath} not found; skipping ${map} map`);
      return undefined;
    }
    return loadLookupData(dataDir, map);
  };
  const atsLookups = loadIfPresent('usa');
  const ets2Lookups = loadIfPresent('europe');
  if (!atsLookups && !ets2Lookups) {
    throw new Error(
      `no navigation data found in ${dataDir}. ` +
        'expected usa-navigation.zip and/or europe-navigation.zip.',
    );
  }
  const lookups = new LookupServiceImpl(atsLookups, ets2Lookups);

  const kv = createCacheableKv();
  const rateLimit = createRateLimitService(kv);
  const metrics = createMetricsService();
  const search = createSearchService(lookups, metrics.worker);
  const routing = createRoutingService(lookups, metrics.worker);
  const domainEventSink: DomainEventSink = {
    publish(event) {
      let logMethod;
      switch (event.type) {
        case 'routeRecalculated':
        case 'info':
          logMethod = logger.info;
          break;
        case 'assertionFailed':
          logMethod = logger.warn;
          break;
        case 'error':
          logMethod = logger.error;
          break;
        default:
          throw new UnreachableError(event);
      }
      logMethod('domain event', { event });
    },
  };
  const sessionActors = new SessionActorRegistryImpl({
    domainEventSink,
    maxClientsPerActor: 5,
    idleTtlMs: 10 * 60_000, // 10 minutes
    getGraphAndMapData: (gameContext: GameContext) =>
      lookups.getData(gameContext).graphAndMapData,
    routing,
    kv,
    // TODO wire up create + delete metrics
    metrics,
    onCreate: actor => logger.info('created actor', actor.code),
    onDelete: (actor, reason) =>
      logger.info(`deleted actor (reason: ${reason})`, actor.code),
  });

  setInterval(() => {
    sessionActors.sweepIdle();
  }, 10_000);

  return {
    lookups,
    domainEventSink,
    kv,
    sessionActors,
    search,
    routing,
    rateLimit,
    metrics,
  };
}
