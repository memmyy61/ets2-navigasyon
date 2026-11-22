import { Stack } from '@mui/joy';
import type { ReactElement } from 'react';

export const HudStack = (props: {
  Direction: () => ReactElement;
  SpeedLimit: () => ReactElement;
  RecenterFab: () => ReactElement;
  RouteFab: () => ReactElement;
  SearchFab: () => ReactElement;
  /** ETS2 Navigasyon: in-game clock in the bottom-right corner. */
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
        <props.Direction />
        <props.SpeedLimit />
      </Stack>
      <Stack
        alignSelf={'end'}
        alignItems={'center'}
        sx={{ pointerEvents: 'auto' }}
      >
        <props.RecenterFab />
        <props.RouteFab />
        <props.SearchFab />
        {props.Clock && (
          <Stack sx={{ mt: 1 }}>
            <props.Clock />
          </Stack>
        )}
      </Stack>
    </Stack>
  );
};
