export const NODE_ENV = process.env.NODE_ENV ?? 'development';

// ETS2 Navigasyon: the navigation server runs on this same PC (inside WSL),
// so the client talks to it over localhost. Override with the NAV_SERVER
// environment variable (host:port) if the server runs somewhere else.
const serverHost = process.env.NAV_SERVER ?? 'localhost:62840';

export const apiUrl = `ws://${serverHost}/telemetry`;
export const healthUrl = `http://${serverHost}/health`;
// The server also serves the navigator web app. Phones on the local network
// should use the PC's LAN address instead; see `getLanNavigatorUrls`.
export const navigatorUrl = process.env.NAV_URL ?? `http://${serverHost}`;
