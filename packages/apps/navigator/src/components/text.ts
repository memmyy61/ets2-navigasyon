import { assert, assertExists } from '@truckermudgeon/base/assert';
import { UnreachableError } from '@truckermudgeon/base/precon';
import { BranchType } from '@truckermudgeon/navigation/constants';
import type {
  SearchResult,
  StepManeuver,
} from '@truckermudgeon/navigation/types';

export const defaultImperialOptions = {
  units: 'imperial',
  abbreviateUnits: true,
  forceSingular: false,
} as const;

export const defaultMetricOptions = {
  units: 'metric',
  abbreviateUnits: true,
  forceSingular: false,
} as const;

export function toLengthAndUnit(
  meters: number,
  options: {
    abbreviateUnits: boolean;
    units: 'metric' | 'imperial';
    forceSingular: boolean;
  },
): {
  length: number;
  unit: string;
  string: string;
} {
  let raw: { length: number; unit: string };
  const { abbreviateUnits, units, forceSingular } = options;
  if (units === 'metric') {
    meters = Math.round(meters);
    if (meters <= 100) {
      const length = Math.round(Number(meters.toPrecision(1)) / 10) * 10;
      const singular = forceSingular || length === 1;
      raw = {
        length,
        unit: abbreviateUnits ? 'm' : 'metre',
      };
    } else if (meters <= 200) {
      const length = Number(meters.toPrecision(2));
      raw = {
        length,
        unit: abbreviateUnits ? 'm' : 'metre',
      };
    } else if (meters <= 1000) {
      const length = Number((Math.round(meters / 50) * 50).toPrecision(2));
      raw = {
        length,
        unit: abbreviateUnits ? 'm' : 'metre',
      };
    } else {
      raw = {
        length: Math.round(meters / 1000),
        unit: abbreviateUnits ? 'km' : 'kilometre',
      };
    }
  } else {
    const miles = meters * 0.0006213712;
    if (miles <= 0.1) {
      const feet = Math.max(1, meters * 3.28084);
      const length = Math.round(feet / 50) * 50;
      const singular = forceSingular || length === 1;
      raw = {
        length,
        unit: abbreviateUnits ? 'ft' : singular ? 'foot' : 'feet',
      };
    } else if (miles <= 1) {
      const length = Number(miles.toPrecision(1));
      const singular = forceSingular || length === 1;
      raw = {
        length,
        unit: abbreviateUnits ? 'mi' : singular ? 'mile' : 'miles',
      };
    } else if (miles <= 10) {
      raw = {
        length: Number(miles.toPrecision(2)),
        unit: abbreviateUnits ? 'mi' : forceSingular ? 'mile' : 'miles',
      };
    } else {
      raw = {
        length: Math.round(miles),
        unit: abbreviateUnits ? 'mi' : forceSingular ? 'mile' : 'miles',
      };
    }
  }

  return {
    ...raw,
    string: `${raw.length.toLocaleString(undefined, { maximumFractionDigits: 2 })} ${raw.unit}`,
  };
}

export function toDuration(
  seconds: number,
  options: { abbreviateUnits: boolean; forceSingular: boolean } = {
    abbreviateUnits: true,
    forceSingular: false,
  },
): {
  hours: number;
  minutes: number;
  string: string;
} {
  const { forceSingular } = options;
  const hourUnit = options.abbreviateUnits
    ? { plural: 'sa', singular: 'sa' }
    : { plural: 'saat', singular: 'saat' };
  const minuteUnit = options.abbreviateUnits
    ? { plural: 'dk', singular: 'dk' }
    : { plural: 'dakika', singular: 'dakika' };
  const hours = Math.floor(seconds / 3600);
  const mins = Math.ceil((seconds % 3600) / 60);

  const strings: string[] = [];
  if (hours) {
    strings.push(
      hours === 1
        ? `1 ${hourUnit.singular}`
        : `${hours} ${forceSingular ? hourUnit.singular : hourUnit.plural}`,
    );
  }
  strings.push(
    mins === 1
      ? `1 ${minuteUnit.singular}`
      : `${mins} ${forceSingular ? minuteUnit.singular : minuteUnit.plural}`,
  );
  const string = options.abbreviateUnits
    ? strings.join(' ')
    : strings.join(', ');

  return {
    hours,
    minutes: mins,
    string,
  };
}

export function toStepText(maneuver: StepManeuver): string {
  // ETS2 Navigasyon: Turkish directions.
  // [lane phrase] [action] [: road/place name]
  const strings: string[] = [];

  if (maneuver.laneHint?.lanes.length) {
    const lanes = maneuver.laneHint.lanes;
    const isAllActive = lanes.every(l => l.activeBranch != null);
    let numLeftLanes = 0;
    for (const lane of lanes) {
      if (lane.activeBranch != null) {
        numLeftLanes++;
        continue;
      }
      break;
    }
    let numRightLanes = 0;
    for (const lane of lanes.toReversed()) {
      if (lane.activeBranch != null) {
        numRightLanes++;
        continue;
      }
      break;
    }
    const through = maneuver.direction === BranchType.THROUGH;

    if (isAllActive) {
      strings.push('herhangi bir şeritten');
    } else if (numLeftLanes > 1) {
      strings.push(
        through ? 'sol tarafta kalarak' : `soldaki ${numLeftLanes} şeritten`,
      );
    } else if (numRightLanes > 1) {
      strings.push(
        through ? 'sağ tarafta kalarak' : `sağdaki ${numRightLanes} şeritten`,
      );
    } else if (numLeftLanes === 1) {
      strings.push(through ? 'sol tarafta kalarak' : 'sol şeritten');
    } else if (numRightLanes === 1) {
      strings.push(through ? 'sağ tarafta kalarak' : 'sağ şeritten');
    } else {
      const activeIndices = [];
      for (let i = 0; i < lanes.length; i++) {
        if (lanes[i].activeBranch != null) {
          activeIndices.push(i);
        }
      }
      assert(activeIndices.length > 0);
      if (activeIndices.length === 1) {
        const num = activeIndices[0] + 1;
        if (num <= lanes.length / 2) {
          strings.push(`soldan ${num}. şeritten`);
        } else {
          strings.push(`sağdan ${lanes.length - num + 1}. şeritten`);
        }
      }
    }
  }

  let textType: 'exit' | 'name' | 'none' = 'none';
  if (maneuver.banner?.text != null) {
    textType = maneuver.banner.text.toLowerCase().startsWith('exit')
      ? 'exit'
      : 'name';
  }

  if (textType === 'exit') {
    const exit = maneuver.banner!.text!.replace(/^exit\s*/i, '');
    strings.push(`${exit} numaralı çıkışı kullanın`);
  } else {
    switch (maneuver.direction) {
      case BranchType.THROUGH:
        strings.push('düz devam edin');
        break;
      case BranchType.SLIGHT_LEFT:
        strings.push('hafif sola dönün');
        break;
      case BranchType.LEFT:
        strings.push('sola dönün');
        break;
      case BranchType.SHARP_LEFT:
        strings.push('keskin sola dönün');
        break;
      case BranchType.SLIGHT_RIGHT:
        strings.push('hafif sağa dönün');
        break;
      case BranchType.RIGHT:
        strings.push('sağa dönün');
        break;
      case BranchType.SHARP_RIGHT:
        strings.push('keskin sağa dönün');
        break;
      case BranchType.U_TURN_LEFT:
      case BranchType.U_TURN_RIGHT:
        strings.push('U dönüşü yapın');
        break;
      case BranchType.ROUND_BR:
      case BranchType.ROUND_R:
      case BranchType.ROUND_TR:
      case BranchType.ROUND_T:
      case BranchType.ROUND_TL:
      case BranchType.ROUND_L:
      case BranchType.ROUND_BL:
      case BranchType.ROUND_B:
        if (!strings.length) {
          strings.push('dönel kavşakta');
        } else {
          strings.push('dönel kavşağa girin,');
        }
        strings.push(`${maneuver.roundaboutExitNumber}. çıkıştan çıkın`);
        break;
      case BranchType.ROUND_EXIT:
        strings.push('dönel kavşaktan çıkın');
        break;
      case BranchType.MERGE:
        strings.push('yola katılın');
        break;
      case BranchType.DEPART:
        strings.push('rotayı takip edin');
        break;
      case BranchType.ARRIVE:
        strings.push(
          textType !== 'none'
            ? `varış: ${maneuver.banner!.text!}`
            : 'hedefinize vardınız',
        );
        break;
      case BranchType.FERRY:
        strings.push(`feribota binin: ${assertExists(maneuver.banner).text}`);
        break;
      default:
        throw new UnreachableError(maneuver);
    }
  }

  let string = strings.join(' ');
  if (
    textType === 'name' &&
    maneuver.direction !== BranchType.ARRIVE &&
    maneuver.direction !== BranchType.FERRY
  ) {
    string += `: ${maneuver.banner!.text!}`;
  }

  return string.charAt(0).toLocaleUpperCase('tr-TR') + string.slice(1);
}

// TODO unify with demo app.
const enum LocationType {
  IN_CITY,
  NEAR_CITY,
  IN_STATE,
}

function classifyLocation(
  name: string,
  nearestCity: { name: string; stateCode: string; distance: number },
): LocationType {
  if (
    nearestCity.distance <= 250 ||
    name.startsWith(nearestCity.name) ||
    name.endsWith(nearestCity.name)
  ) {
    return LocationType.IN_CITY;
  } else if (nearestCity.distance <= 1000) {
    return LocationType.NEAR_CITY;
  } else {
    return LocationType.IN_STATE;
  }
}

export function toLocationString(search: SearchResult): string {
  switch (search.type) {
    case 'city':
    case 'scenery':
      return `${search.label}, ${search.stateCode}`;
    case 'company':
    case 'landmark':
    case 'viewpoint':
    case 'ferry':
    case 'train':
    case 'dealer':
    case 'serviceArea': {
      const location = classifyLocation(search.label, search.city);
      switch (location) {
        case LocationType.IN_CITY:
          return `${search.city.name}, ${search.stateCode}`;
        case LocationType.NEAR_CITY:
          return `${search.city.name} yakını, ${search.stateCode}`;
        case LocationType.IN_STATE:
          return `${search.stateName}`;
        default:
          throw new UnreachableError(location);
      }
    }
    default:
      throw new UnreachableError(search);
  }
}
