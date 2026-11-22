import { UnreachableError } from '@truckermudgeon/base/precon';
import type { GameContext } from '../../domain/game-context';
import type { LookupData, LookupService } from '../../domain/lookup-data';

export class LookupServiceImpl implements LookupService {
  constructor(
    private readonly atsLookups: LookupData | undefined,
    private readonly ets2Lookups: LookupData | undefined,
  ) {}

  hasData(map: GameContext['map']): boolean {
    return (map === 'usa' ? this.atsLookups : this.ets2Lookups) != null;
  }

  getData(context: GameContext): LookupData {
    // Some startup code (job detection, search indexing) builds small
    // indices for both maps. When only one map is loaded, fall back to it;
    // heavy per-map resources (routing/search workers) check `hasData`.
    const data =
      context.map === 'usa'
        ? (this.atsLookups ?? this.ets2Lookups)
        : (this.ets2Lookups ?? this.atsLookups);
    if (!data) {
      throw new UnreachableError(context.map as never);
    }
    return data;
  }
}
