import type { ExtraTelemetry } from '@truckermudgeon/navigation/types';
import { makeAutoObservable, observable } from 'mobx';
import { CameraMode } from './camera';
import type {
  CameraStore,
  ControlsStore,
  NavSheetStore,
  RouteStore,
  SessionStore,
} from './types';

export class ControlsStoreImpl implements ControlsStore {
  bearing = 0;
  limit = 0;
  speed = 0;
  gameTimeMinutes: number | undefined = undefined;
  extra: ExtraTelemetry | undefined = undefined;

  constructor(
    private readonly session: SessionStore,
    private readonly camera: CameraStore,
    private readonly route: RouteStore,
    private readonly navSheet: NavSheetStore,
  ) {
    makeAutoObservable(this, { extra: observable.ref });
  }

  get units(): 'imperial' | 'metric' {
    return this.session.map === 'usa' ? 'imperial' : 'metric';
  }

  get showRecenterFab(): boolean {
    return this.camera.cameraMode === CameraMode.FREE;
  }

  get showRouteFab(): boolean {
    return !this.route.activeRoute && !this.navSheet.showNavSheet;
  }

  get showSearchFab(): boolean {
    return !!this.route.activeRoute && !this.navSheet.showNavSheet;
  }
}
