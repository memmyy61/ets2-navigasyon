import type {
  ExtraTelemetry,
  TruckSimTelemetry,
} from '@truckermudgeon/navigation/types';
import type { TelemetryData } from 'trucksim-telemetry';

export function strip(t: TelemetryData): TruckSimTelemetry {
  return {
    navigation: {
      speedLimit: t.navigation.speedLimit,
    },
    truck: {
      speed: t.truck.speed,
      position: t.truck.position,
      orientation: {
        heading: t.truck.orientation.heading,
      },
      acceleration: {
        linearVelocity: t.truck.acceleration.linearVelocity ?? {
          X: 0,
          Y: 0,
          Z: 0,
        },
        linearAcceleration: t.truck.acceleration.linearAcceleration ?? {
          X: 0,
          Y: 0,
          Z: 0,
        },
        angularVelocity: t.truck.acceleration.angularVelocity,
        angularAcceleration: t.truck.acceleration.angularAcceleration,
      },
    },
    trailer: {
      position: t.trailer.position,
      orientation: {
        heading: t.trailer.orientation.heading,
      },
      attached: t.trailer.attached,
    },
    job: {
      destination: t.job.destination,
      source: t.job.source,
    },
    game: {
      game: {
        name: t.game.game.name as 'ats' | 'ets2',
      },
      paused: t.game.paused,
      timestamp: {
        value: t.game.timestamp.value,
      },
      time: {
        value: t.game.time.value,
      },
      scale: t.game.scale,
    },
    extra: extra(t),
  };
}

/** a finite number, or undefined (so a bad value never fails validation). */
function n(v: unknown): number | undefined {
  return typeof v === 'number' && Number.isFinite(v) ? v : undefined;
}

function b(v: unknown): boolean | undefined {
  return typeof v === 'boolean' ? v : undefined;
}

function str(v: unknown, max: number): string | undefined {
  return typeof v === 'string' ? v.slice(0, max) : undefined;
}

// ETS2 Navigasyon: everything gauges might need, so new gauges can be built
// server-side without another client update. Missing/odd values are dropped.
function extra(t: TelemetryData): ExtraTelemetry | undefined {
  try {
    const truck = t.truck;
    return {
      navigation: {
        distance: n(t.navigation?.distance),
        time: n(t.navigation?.time),
        nextRestStop: n(t.navigation?.nextRestStop),
      },
      fuel: {
        value: n(truck?.fuel?.value),
        capacity: n(truck?.fuel?.capacity),
        range: n(truck?.fuel?.range),
        avgConsumption: n(truck?.fuel?.avgConsumption),
        warning: b(truck?.fuel?.warning?.enabled),
      },
      adBlue: {
        value: n(truck?.adBlue?.value),
        capacity: n(truck?.adBlue?.capacity),
        warning: b(truck?.adBlue?.warning?.enabled),
      },
      cruiseControl: {
        enabled: b(truck?.cruiseControl?.enabled),
        kph: n(truck?.cruiseControl?.kph),
      },
      odometer: n(truck?.odometer),
      damage: {
        cabin: n(truck?.damage?.cabin),
        chassis: n(truck?.damage?.chassis),
        engine: n(truck?.damage?.engine),
        transmission: n(truck?.damage?.transmission),
        wheels: n(truck?.damage?.wheels),
        total: n(truck?.damage?.total),
        cargo: n(t.job?.cargo?.damage),
        trailer: n(t.trailer?.damage?.total),
      },
      truckState: {
        engineEnabled: b(truck?.engine?.enabled),
        electricEnabled: b(truck?.electric?.enabled),
        parkingBrake: b(truck?.brakes?.parking?.enabled),
        lowBeam: b(truck?.lights?.beamLow?.enabled),
        highBeam: b(truck?.lights?.beamHigh?.enabled),
        beacon: b(truck?.lights?.beacon?.enabled),
        hazard: b(truck?.lights?.hazard?.enabled),
        blinkerLeft: b(truck?.lights?.blinker?.left?.active),
        blinkerRight: b(truck?.lights?.blinker?.right?.active),
        wipers: b(truck?.wipers?.enabled),
        gear: n(truck?.transmission?.gear?.displayed),
        rpm: n(truck?.engine?.rpm?.value),
      },
      job: {
        income: n(t.job?.income),
        plannedDistanceKm: n(t.job?.plannedDistance?.km),
        cargoName: str(t.job?.cargo?.name, 100),
        cargoMass: n(t.job?.cargo?.mass),
        deliveryTime: n(t.job?.expectedDeliveryTimestamp?.value),
        isSpecial: b(t.job?.isSpecial),
        market: str(t.job?.market?.id, 50),
      },
      gameTimeUnix: n(t.game?.time?.unix),
    };
  } catch {
    return undefined;
  }
}
