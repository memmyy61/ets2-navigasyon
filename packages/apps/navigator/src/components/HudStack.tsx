import { Stack } from '@mui/joy';
import type { ReactElement } from 'react';

// ETS2 Navigasyon layout:
// - top right: speed limit sign (under the directions banner)
// - bottom right: recenter, compass, route and search buttons, then the
//   in-game clock and fuel range (just above the route bar).
export const HudStack = (props: {
  Direction: () => ReactElement;
  SpeedLimit: () => ReactElement;
  RecenterFab: () => ReactElement;
  RouteFab: () => ReactElement;
  SearchFab: () => ReactElement;
  Clock?: () => ReactElement;
}) => {
  console.log('render controls');
  return (
    <Stack direction={'column'} justifyContent={'space-between'}>
      <Stack
        gap={2}
        alignSelf={'end'}
        alignItems={'end'}
        sx={{ pointerEvents: 'auto' }}
      >
        <props.SpeedLimit />
      </Stack>
      <Stack
        alignSelf={'end'}
        alignItems={'center'}
        sx={{ pointerEvents: 'auto' }}
      >
        <props.RecenterFab />
        <props.Direction />
        <props.RouteFab />
        <props.SearchFab />
        {props.Clock && (
          <Stack sx={{ mt: 1 }} alignItems={'flex-end'} alignSelf={'end'}>
            <props.Clock />
          </Stack>
        )}
      </Stack>
    </Stack>
  );
};
