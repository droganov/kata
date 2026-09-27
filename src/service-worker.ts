import { build, files, version } from '$service-worker';

import { serveOffline } from './routes/offline-shell.ts';

serveOffline(globalThis, { build, files, version });
