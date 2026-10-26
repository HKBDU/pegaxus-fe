/**
 * Mock Geolocation Layer for Driver GPS Simulation
 * Intercepts Web Geolocation API and navigator.permissions so that LocationSender
 * and any other components receive authentic-looking GeolocationPosition updates.
 */

export interface MockPositionParams {
  latitude: number;
  longitude: number;
  speedKmh: number;
  heading: number;
  accuracyMeters?: number;
}

interface Watcher {
  id: number;
  success: PositionCallback;
  error?: PositionErrorCallback | null;
  options?: PositionOptions;
}

class MockGeolocationController {
  private isEnabled = false;
  private nextWatchId = 1000;
  private watchers = new Map<number, Watcher>();
  private lastPosition: GeolocationPosition | null = null;
  private isSignalLoss = false;

  private originalWatchPosition: typeof navigator.geolocation.watchPosition | null = null;
  private originalClearWatch: typeof navigator.geolocation.clearWatch | null = null;
  private originalGetCurrentPosition: typeof navigator.geolocation.getCurrentPosition | null = null;
  private originalPermissionsQuery: typeof navigator.permissions.query | null = null;

  public enable() {
    if (this.isEnabled || typeof window === "undefined" || !navigator.geolocation) {
      return;
    }

    this.originalWatchPosition = navigator.geolocation.watchPosition.bind(navigator.geolocation);
    this.originalClearWatch = navigator.geolocation.clearWatch.bind(navigator.geolocation);
    this.originalGetCurrentPosition = navigator.geolocation.getCurrentPosition.bind(navigator.geolocation);

    if (navigator.permissions?.query) {
      this.originalPermissionsQuery = navigator.permissions.query.bind(navigator.permissions);
    }

    // Intercept watchPosition
    navigator.geolocation.watchPosition = (
      success: PositionCallback,
      error?: PositionErrorCallback | null,
      options?: PositionOptions,
    ): number => {
      const id = ++this.nextWatchId;
      this.watchers.set(id, { id, success, error, options });

      // If we already have a mock position, push it immediately in next tick
      if (this.lastPosition && !this.isSignalLoss) {
        const pos = this.lastPosition;
        setTimeout(() => {
          if (this.watchers.has(id)) {
            success(pos);
          }
        }, 0);
      }
      return id;
    };

    // Intercept clearWatch
    navigator.geolocation.clearWatch = (id: number): void => {
      this.watchers.delete(id);
    };

    // Intercept getCurrentPosition
    navigator.geolocation.getCurrentPosition = (
      success: PositionCallback,
      error?: PositionErrorCallback | null,
    ): void => {
      if (this.lastPosition && !this.isSignalLoss) {
        const pos = this.lastPosition;
        setTimeout(() => success(pos), 0);
      } else if (error && this.isSignalLoss) {
        setTimeout(
          () =>
            error({
              code: 2, // POSITION_UNAVAILABLE
              message: "Simulated signal loss.",
              PERMISSION_DENIED: 1,
              POSITION_UNAVAILABLE: 2,
              TIMEOUT: 3,
            }),
          0,
        );
      } else if (this.originalGetCurrentPosition) {
        this.originalGetCurrentPosition(success, error);
      }
    };

    // Intercept permissions.query
    if (navigator.permissions?.query) {
      navigator.permissions.query = async (
        desc: PermissionDescriptor,
      ): Promise<PermissionStatus> => {
        if (desc.name === "geolocation") {
          const fakeStatus: Partial<PermissionStatus> = {
            state: "granted",
            name: "geolocation" as PermissionName,
            onchange: null,
            addEventListener: () => {},
            removeEventListener: () => {},
            dispatchEvent: () => true,
          };
          return fakeStatus as PermissionStatus;
        }
        return this.originalPermissionsQuery!(desc);
      };
    }

    this.isEnabled = true;
  }

  public disable() {
    if (!this.isEnabled || typeof window === "undefined") {
      return;
    }

    if (this.originalWatchPosition) {
      navigator.geolocation.watchPosition = this.originalWatchPosition;
    }
    if (this.originalClearWatch) {
      navigator.geolocation.clearWatch = this.originalClearWatch;
    }
    if (this.originalGetCurrentPosition) {
      navigator.geolocation.getCurrentPosition = this.originalGetCurrentPosition;
    }
    if (this.originalPermissionsQuery && navigator.permissions) {
      navigator.permissions.query = this.originalPermissionsQuery;
    }

    this.watchers.clear();
    this.lastPosition = null;
    this.isSignalLoss = false;
    this.isEnabled = false;
  }

  public setSignalLoss(loss: boolean) {
    this.isSignalLoss = loss;
  }

  public getIsSignalLoss(): boolean {
    return this.isSignalLoss;
  }

  public getIsEnabled(): boolean {
    return this.isEnabled;
  }

  public dispatchPosition(params: MockPositionParams) {
    const { latitude, longitude, speedKmh, heading, accuracyMeters = 8 } = params;

    const speedMps = Math.max(0, speedKmh / 3.6);

    const position: GeolocationPosition = {
      coords: {
        latitude,
        longitude,
        accuracy: accuracyMeters,
        altitude: null,
        altitudeAccuracy: null,
        heading: (heading + 360) % 360,
        speed: speedMps,
      },
      timestamp: Date.now(),
    };

    this.lastPosition = position;

    // Do not notify watchers if signal is currently lost
    if (this.isSignalLoss) {
      return;
    }

    for (const watcher of this.watchers.values()) {
      try {
        watcher.success(position);
      } catch (err) {
        console.warn("[MockGeolocation] watcher callback error:", err);
      }
    }
  }

  public getLastPosition(): GeolocationPosition | null {
    return this.lastPosition;
  }
}

export const mockGeolocation = new MockGeolocationController();
