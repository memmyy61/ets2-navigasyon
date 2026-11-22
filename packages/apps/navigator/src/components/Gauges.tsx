import { LocalGasStation } from '@mui/icons-material';
import { Stack, Typography } from '@mui/joy';
import type { ExtraTelemetry } from '@truckermudgeon/navigation/types';
import { formatGameClock } from '../util/game-units';

/**
 * ETS2 Navigasyon: small fuel indicator shown under the speed widget.
 */
export const FuelGauge = (props: { extra: ExtraTelemetry | undefined }) => {
  const fuel = props.extra?.fuel;
  if (fuel?.value == null || !fuel.capacity) {
    return null;
  }
  const pct = Math.round((fuel.value / fuel.capacity) * 100);
  const color =
    fuel.warning || pct <= 10 ? '#ff5252' : pct <= 25 ? '#ffb300' : '#fff';
  return (
    <Stack
      direction={'row'}
      alignItems={'center'}
      gap={0.25}
      sx={{
        backgroundColor: '#000b',
        borderRadius: '1em',
        px: 0.75,
        py: 0.125,
      }}
    >
      <LocalGasStation sx={{ color, fontSize: '1em' }} />
      <Typography
        level={'body-sm'}
        fontWeight={'bold'}
        sx={{ color, lineHeight: 1.4 }}
      >
        %{pct}
      </Typography>
    </Stack>
  );
};

/**
 * ETS2 Navigasyon: the in-game clock, like a phone's status bar clock.
 */
export const GameClock = (props: {
  localGameTimeMinutes: number | undefined;
}) => {
  if (props.localGameTimeMinutes == null) {
    return null;
  }
  const { time } = formatGameClock(props.localGameTimeMinutes);
  return (
    <Typography
      level={'body-md'}
      fontWeight={'bold'}
      sx={{
        backgroundColor: '#000b',
        color: '#fff',
        borderRadius: '1em',
        px: 1,
        py: 0.125,
        lineHeight: 1.4,
        fontVariantNumeric: 'tabular-nums',
      }}
    >
      {time}
    </Typography>
  );
};
