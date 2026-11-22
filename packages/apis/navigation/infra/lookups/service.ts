import { UnreachableError } from '@truckermudgeon/base/precon';
import type { GameContext } from '../../domain/game-context';
import type { LookupData, LookupService } from '../../domain/lookup-data';

export class LookupServiceImpl implements LookupService {
  constructor(
    private readonly atsLookups: LookupData | undefined,
    private readonly ets2Lookups: LookupData | undefined,
  ) {}

  getData(context: GameContext): LookupData {
    switch (context.map) {
      case 'usa':
        if (!this.atsLookups) {
          throw new Error('ATS (usa) harita verisi yuklu degil.');
        }
        return this.atsLookups;
      case 'europe':
        if (!this.ets2Lookups) {
          throw new Error('ETS2 (europe) harita verisi yuklu degil.');
        }
        return this.ets2Lookups;
      default:
        throw new UnreachableError(context.map);
    }
  }
}
