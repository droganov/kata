import { build, files, version } from '$service-worker';

import { serveOffline } from './routes/offline-shell.ts';

serveOffline(globalThis, { assets: [...build, ...files], version });
