import type {
  SearchReducerOptions,
  SearchSearcherOptions,
  SearchService,
} from '../../domain/actor/search';
import { SearchServiceImpl } from '../../domain/actor/search';
import type { GameContext } from '../../domain/game-context';
import type { LookupService } from '../../domain/lookup-data';
import type { SearchResult } from '../../types';
import type { MetricsService } from '../metrics/service';
import type { WorkerPool } from '../workers/pool';
import { createPool } from '../workers/pool';
import type { Options as SearchWorkerOptions } from '../workers/search-worker';

// searchData: ProcessedSearchData,
// graphNodeRTree: PointRBush<{ x: number; y: number; z: number; node: Node }>,

export function createSearchService(
  lookups: LookupService,
  metrics: MetricsService['worker'],
): SearchService {
  const [atsSearcherPool, ets2SearcherPool] = (['usa', 'europe'] as const).map(
    game =>
      lookups.hasData(game)
        ? createPool<SearchWorkerOptions>({
            wrapperUrl: new URL(
              '../workers/search-worker-wrapper.js',
              import.meta.url,
            ),
            workerData: {
              rbushJSON: lookups.getData({ map: game }).searchData
                .searchDataLngLatRTreeJSON,
            },
            inline: async () =>
              (await import('../workers/search-worker')).default,
          })
        : undefined,
  );
  const searcher = async (
    opts: SearchSearcherOptions,
  ): Promise<SearchResult[]> => {
    const start = Date.now();
    const meta = { name: 'search', game: opts.gameContext.map };
    try {
      metrics.workerCalls.inc(meta);
      const pool = assertPool(
        opts.gameContext.map === 'usa' ? atsSearcherPool : ets2SearcherPool,
        opts.gameContext.map,
      );
      return (await pool.run({ bbox: opts.bbox })) as SearchResult[];
    } finally {
      metrics.workerDuration.observe(meta, Date.now() - start);
    }
  };

  const [atsReducerPool, ets2ReducerPool] = (['usa', 'europe'] as const).map(
    game =>
      lookups.hasData(game)
        ? createPool<SearchReducerOptions>({
            wrapperUrl: new URL(
              '../workers/search-results-worker-wrapper.js',
              import.meta.url,
            ),
            workerData: {
              rbushJSON: lookups.getData({ map: game }).searchData
                .searchDataLngLatRTreeJSON,
            },
            inline: async () =>
              (await import('../workers/search-results-worker')).default,
          })
        : undefined,
  );
  const reducer = async (
    opts: SearchReducerOptions,
  ): Promise<SearchResult[]> => {
    const start = Date.now();
    const meta = {
      name: 'search-results-reducer',
      game: opts.gameContext.map,
    };
    try {
      metrics.workerCalls.inc(meta);
      const pool = assertPool(
        opts.gameContext.map === 'usa' ? atsReducerPool : ets2ReducerPool,
        opts.gameContext.map,
      );
      return (await pool.run(opts)) as SearchResult[];
    } finally {
      metrics.workerDuration.observe(meta, Date.now() - start);
    }
  };

  const getLookup = (gameContext: GameContext) => ({
    processedSearchData: lookups.getData(gameContext).searchData,
    graphNodeRTree: lookups.getData(gameContext).graphAndMapData.graphNodeRTree,
  });

  return new SearchServiceImpl(searcher, reducer, getLookup);
}

function assertPool(
  pool: WorkerPool | undefined,
  map: GameContext['map'],
): WorkerPool {
  if (!pool) {
    throw new Error(`no ${map} map data loaded`);
  }
  return pool;
}
