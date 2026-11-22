import { AccessTime, Hotel, LocalGasStation, Speed } from '@mui/icons-material';
import { Stack, Typography } from '@mui/joy';
import type { ExtraTelemetry } from '@truckermudgeon/navigation/types';
import type { ReactElement } from 'react';
import { formatGameClock, formatHoursMinutes } from '../util/game-units';

/**
 * ETS2 Navigasyon: small dark "pills" shown under the speed widget:
 * game clock, fuel, time until rest, cruise control, delivery deadline.
 */
export const Gauges = (props: {
  gameTimeMinutes: number | undefined;
  extra: ExtraTelemetry | undefined;
}) => {
  const { gameTimeMinutes, extra } = props;
  const rows: ReactElement[] = [];

  if (gameTimeMinutes != null) {
    const { day, time } = formatGameClock(gameTimeMinutes);
    rows.push(<Pill key={'clock'} Icon={AccessTime} text={`${day} ${time}`} />);
  }

  const fuel = extra?.fuel;
  if (fuel?.value != null && fuel.capacity) {
    const pct = Math.round((fuel.value / fuel.capacity) * 100);
    const range =
      fuel.range != null && fuel.range > 0
        ? ` · ${Math.round(fuel.range)} km`
        : '';
    rows.push(
      <Pill
        key={'fuel'}
        Icon={LocalGasStation}
        text={`%${pct}${range}`}
        color={
          fuel.warning || pct <= 10
            ? 'danger'
            : pct <= 25
              ? 'warning'
              : undefined
        }
      />,
    );
  }

  const rest = extra?.navigation?.nextRestStop;
  if (rest != null && rest >= 0) {
    rows.push(
      <Pill
        key={'rest'}
        Icon={Hotel}
        text={formatHoursMinutes(rest)}
        color={rest <= 30 ? 'danger' : rest <= 90 ? 'warning' : undefined}
      />,
    );
  }

  const cruise = extra?.cruiseControl;
  if (cruise?.enabled && cruise.kph != null) {
    rows.push(
      <Pill
        key={'cruise'}
        Icon={Speed}
        text={`${Math.round(cruise.kph)} km/sa`}
      />,
    );
  }

  const deadline = extra?.job?.deliveryTime;
  if (
    deadline != null &&
    deadline > 0 &&
    gameTimeMinutes != null &&
    extra?.job?.plannedDistanceKm
  ) {
    const left = deadline - gameTimeMinutes;
    const { day, time } = formatGameClock(deadline);
    rows.push(
      <Pill
        key={'deadline'}
        text={`Teslim ${day} ${time}`}
        color={left < 0 ? 'danger' : left < 120 ? 'warning' : undefined}
      />,
    );
  }

  if (rows.length === 0) {
    return null;
  }
  return (
    <Stack gap={0.5} alignItems={'flex-end'}>
      {rows}
    </Stack>
  );
};

const colors = {
  warning: '#ffb300',
  danger: '#ff5252',
};

const Pill = (props: {
  Icon?: typeof AccessTime;
  text: string;
  color?: keyof typeof colors;
}) => {
  const color = props.color ? colors[props.color] : '#fff';
  return (
    <Stack
      direction={'row'}
      alignItems={'center'}
      gap={0.5}
      sx={{
        backgroundColor: '#000c',
        borderRadius: '1em',
        px: 1,
        py: 0.25,
        boxShadow: '0 0 2px 0 #0008',
      }}
    >
      {props.Icon && <props.Icon sx={{ color, fontSize: '1.1em' }} />}
      <Typography
        level={'body-sm'}
        fontWeight={'bold'}
        sx={{ color, whiteSpace: 'nowrap' }}
      >
        {props.text}
      </Typography>
    </Stack>
  );
};
