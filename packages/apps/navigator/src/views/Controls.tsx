import { Directions, NavigationOutlined, Search } from '@mui/icons-material';
import { Stack } from '@mui/joy';
import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import { Compass } from '../components/Compass';
import { Fab } from '../components/Fab';
import { FuelGauge, GameClock } from '../components/Gauges';
import { HudStack } from '../components/HudStack';
import { SpeedLimit } from '../components/SpeedLimit';
import { useMapCamera } from '../services/context';
import { CameraMode } from '../stores/camera';
import { useCameraStore } from '../stores/hooks/use-camera';
import { useControlsStore } from '../stores/hooks/use-controls';
import { useNavSheetStore } from '../stores/hooks/use-nav-sheet';
import { useSessionStore } from '../stores/hooks/use-session';
import { requestWakeLock } from '../util/browser';

export const Controls = () => (
  <HudStack
    Direction={CompassControl}
    SpeedLimit={SpeedLimitControl}
    RecenterFab={RecenterFab}
    RouteFab={RouteFab}
    SearchFab={SearchFab}
    Clock={GameClockControl}
  />
);

// ETS2 Navigasyon: the compass only shows when the map was moved by hand
// (zoom/drag/rotate). Tapping it turns the map north-up, like the game's map.
const CompassControl = observer(() => {
  const session = useSessionStore();
  const camera = useCameraStore();
  const controls = useControlsStore();
  const mapCamera = useMapCamera();
  if (camera.cameraMode !== CameraMode.FREE) {
    return <></>;
  }
  return (
    <Stack sx={{ my: 1 }}>
      <Compass
        mode={session.themeMode}
        bearing={controls.bearing}
        onClick={action(() => {
          requestWakeLock();
          mapCamera.rotateToNorth();
        })}
      />
    </Stack>
  );
});

// ETS2 Navigasyon: only the speed limit sign (it turns red when speeding).
const SpeedLimitControl = observer(() => {
  const controls = useControlsStore();
  return (
    <SpeedLimit
      units={controls.units}
      limit={controls.limit}
      speed={controls.speed}
    />
  );
});

const GameClockControl = observer(() => {
  const controls = useControlsStore();
  return (
    <Stack gap={0.5} alignItems={'flex-end'}>
      <GameClock localGameTimeMinutes={controls.localGameTimeMinutes} />
      <FuelGauge extra={controls.extra} />
    </Stack>
  );
});

const RecenterFab = observer(() => {
  const camera = useCameraStore();
  const controls = useControlsStore();
  return (
    <Fab
      show={controls.showRecenterFab}
      variant={'plain'}
      backgroundColor={'background.body'}
      Icon={() => (
        <NavigationOutlined sx={{ transform: 'scale(1.25) rotate(30deg)' }} />
      )}
      onClick={action(() => {
        requestWakeLock();
        // back to following the truck, heading-up
        camera.setNorthUnlock();
        camera.setFollow();
      })}
    />
  );
});

const RouteFab = observer(() => {
  const controls = useControlsStore();
  const navSheet = useNavSheetStore();
  return (
    <Fab
      show={controls.showRouteFab}
      Icon={() => <Directions sx={{ transform: 'scale(1.25)' }} />}
      onClick={action(() => {
        requestWakeLock();
        navSheet.startChooseDestinationFlow();
      })}
    />
  );
});

const SearchFab = observer(() => {
  const controls = useControlsStore();
  const camera = useCameraStore();
  const navSheet = useNavSheetStore();
  return (
    <Fab
      show={controls.showSearchFab && camera.cameraMode === CameraMode.FREE}
      Icon={() => <Search sx={{ transform: 'scale(1.25)' }} />}
      onClick={action(() => {
        requestWakeLock();
        navSheet.startSearchAlongFlow();
      })}
    />
  );
});
