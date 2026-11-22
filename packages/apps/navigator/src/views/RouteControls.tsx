import { action } from 'mobx';
import { observer } from 'mobx-react-lite';
import { RouteControls as RouteControlsComponent } from '../components/RouteControls';
import {
  defaultImperialOptions,
  defaultMetricOptions,
  toLengthAndUnit,
} from '../components/text';
import { useAppController, useMapCamera } from '../services/context';
import { useCameraStore } from '../stores/hooks/use-camera';
import { useControlsStore } from '../stores/hooks/use-controls';
import { useNavSheetStore } from '../stores/hooks/use-nav-sheet';
import { useRouteStore } from '../stores/hooks/use-route';
import { useSessionStore } from '../stores/hooks/use-session';
import {
  displayPrefs,
  formatGameClock,
  formatRealClock,
  gameGpsEstimate,
  toGameMeters,
  toGameSeconds,
  toggleTimeMode,
} from '../util/game-units';
import { routeCornerPair } from '../util/route-bounds';
import { toRouteSummary } from '../util/route-display';

export const RouteControls = observer(
  (props: { onExpandedToggle: (expanded: boolean) => void }) => {
    const route = useRouteStore();
    const session = useSessionStore();
    const camera = useCameraStore();
    const navSheetStore = useNavSheetStore();
    const controller = useAppController();
    const mapCamera = useMapCamera();

    const unitOptions =
      session.map === 'usa' ? defaultImperialOptions : defaultMetricOptions;
    const realSummary = route.activeRouteToFirstWayPointSummary;
    const summary = toRouteSummary(realSummary, unitOptions);
    const controls = useControlsStore();

    // ETS2 Navigasyon: game-scale totals. If the route goes to the current
    // job's destination (single segment), use the game's own route advisor
    // estimate; otherwise scale the map-based estimate.
    const realMeters = realSummary?.distanceMeters ?? 0;
    const realMinutes = realSummary?.minutes ?? 0;
    const segments = route.activeRoute?.segments ?? [];
    const endNodeUid = segments.at(-1)?.key.split('-')[1];
    const routeIsToJob =
      segments.length === 1 &&
      route.activeJob != null &&
      endNodeUid != null &&
      BigInt('0x' + endNodeUid) === BigInt('0x' + route.activeJob.toNodeUid);
    const gps = routeIsToJob ? gameGpsEstimate(controls.extra) : undefined;
    const gameMeters = gps?.meters ?? toGameMeters(realMeters, session.map);
    const gameMinutes = gps
      ? gps.seconds / 60
      : toGameSeconds(realMinutes * 60, session.map) / 60;

    const isGame = displayPrefs.timeMode === 'game';
    let arrival: string;
    const clockNow = controls.localGameTimeMinutes;
    if (isGame && clockNow != null) {
      const clock = formatGameClock(clockNow + gameMinutes);
      const today = formatGameClock(clockNow).day;
      arrival = clock.day === today ? clock.time : `${clock.day} ${clock.time}`;
    } else {
      arrival = formatRealClock(new Date(Date.now() + realMinutes * 60_000));
    }
    const display = {
      mode: isGame ? ('game' as const) : ('real' as const),
      arrival,
      durationMinutes: isGame ? gameMinutes : realMinutes,
      distance: toLengthAndUnit(isGame ? gameMeters : realMeters, unitOptions),
    };

    const showManageStops =
      route.activeRoute != null && route.activeRoute.segments.length > 1;
    return (
      <RouteControlsComponent
        summary={summary}
        display={display}
        onTimeModeToggle={toggleTimeMode}
        onExpandedToggle={props.onExpandedToggle}
        onManageStopsClick={
          showManageStops
            ? action(() => navSheetStore.startManageStopsFlow())
            : undefined
        }
        onSearchAlongRouteClick={action(() =>
          navSheetStore.startSearchAlongFlow(),
        )}
        onRoutePreviewClick={action(() => {
          if (!route.activeRoute) {
            console.warn('no active route to preview');
            return;
          }
          camera.setFree();
          mapCamera.fitPoints(routeCornerPair(route.activeRoute));
        })}
        onRouteDirectionsClick={action(() =>
          navSheetStore.startShowActiveRouteDirectionsFlow(),
        )}
        onRouteEndClick={action(() => controller.setActiveRoute(undefined))}
      />
    );
  },
);
