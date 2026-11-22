import { z } from 'zod';

export const SpeedSchema = z.object({
  value: z.number(), // m/s
  kph: z.number(),
  mph: z.number(),
});

export const PositionSchema = z.object({
  X: z.number(),
  Y: z.number(),
  Z: z.number(),
});

export const OrientationSchema = z.object({
  // [0(north), 1], CCW
  heading: z.number().min(0).max(1),
});

export const JobLocationSchema = z.object({
  city: z.object({
    id: z.string().max(12),
    name: z.string().max(100),
  }),
  company: z.object({
    id: z.string().max(12),
    name: z.string().max(100),
  }),
});

const num = z.number().finite();

/**
 * ETS2 Navigasyon: additional telemetry for gauges (fuel, the game's own GPS
 * estimates, job details, ...). Everything is optional so older clients
 * keep working, and new fields can be read server-side without another
 * client update.
 */
export const ExtraTelemetrySchema = z
  .object({
    navigation: z
      .object({
        // the game's route advisor: distance (m) and time (s) to destination
        distance: num,
        time: num,
        // minutes of game time until the driver must rest
        nextRestStop: num,
      })
      .partial(),
    fuel: z
      .object({
        value: num, // liters
        capacity: num,
        range: num, // km
        avgConsumption: num, // l/km
        warning: z.boolean(),
      })
      .partial(),
    adBlue: z
      .object({
        value: num,
        capacity: num,
        warning: z.boolean(),
      })
      .partial(),
    cruiseControl: z
      .object({
        enabled: z.boolean(),
        kph: num,
      })
      .partial(),
    odometer: num, // km
    damage: z
      .object({
        cabin: num,
        chassis: num,
        engine: num,
        transmission: num,
        wheels: num,
        total: num,
        cargo: num,
        trailer: num,
      })
      .partial(),
    truckState: z
      .object({
        engineEnabled: z.boolean(),
        electricEnabled: z.boolean(),
        parkingBrake: z.boolean(),
        lowBeam: z.boolean(),
        highBeam: z.boolean(),
        beacon: z.boolean(),
        hazard: z.boolean(),
        blinkerLeft: z.boolean(),
        blinkerRight: z.boolean(),
        wipers: z.boolean(),
        gear: num,
        rpm: num,
      })
      .partial(),
    job: z
      .object({
        income: num,
        plannedDistanceKm: num,
        cargoName: z.string().max(100),
        cargoMass: num, // kg
        // minutes since Day 0, like `game.time.value`
        deliveryTime: num,
        isSpecial: z.boolean(),
        market: z.string().max(50),
      })
      .partial(),
    gameTimeUnix: num,
  })
  .partial();

export const TruckSimTelemetrySchema = z.object({
  navigation: z.object({
    speedLimit: SpeedSchema,
  }),
  truck: z.object({
    speed: SpeedSchema,
    position: PositionSchema,
    orientation: OrientationSchema,
    acceleration: z.object({
      linearVelocity: PositionSchema,
      linearAcceleration: PositionSchema,
      angularVelocity: PositionSchema,
      angularAcceleration: PositionSchema,
    }),
  }),
  trailer: z.object({
    attached: z.boolean(),
    position: PositionSchema,
    orientation: OrientationSchema,
  }),
  job: z.object({
    destination: JobLocationSchema,
    source: JobLocationSchema,
  }),
  game: z.object({
    game: z.object({
      name: z.enum(['ats', 'ets2']),
    }),
    paused: z.boolean(),
    timestamp: z.object({
      // goes up when game isn't paused
      value: z.number(),
    }),
    time: z.object({
      // minutes since Day 0
      value: z.number(),
    }),
    scale: z.number(),
  }),
  extra: ExtraTelemetrySchema.optional(),
});
