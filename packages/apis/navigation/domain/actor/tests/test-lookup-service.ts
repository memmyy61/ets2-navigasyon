import path from 'node:path';
import url from 'node:url';
import { loadLookupData } from '../../../infra/lookups/loader';
import type { LookupData, LookupService } from '../../lookup-data';

export class TestLookupService implements LookupService {
  private readonly lookupData: LookupData;
  private readonly map: 'usa' | 'europe';

  constructor(map: 'usa' | 'europe') {
    this.map = map;
    const __filename = url.fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const outDir = path.join(__dirname, '../../../../../../out');
    this.lookupData = loadLookupData(outDir, map);
  }

  hasData(map: 'usa' | 'europe'): boolean {
    return map === this.map;
  }

  getData(): LookupData {
    return this.lookupData;
  }
}

export const testLookupService = (map: 'usa' | 'europe' = 'usa') =>
  new TestLookupService(map);
