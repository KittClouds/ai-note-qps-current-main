
import { makeWorker } from '@livestore/adapter-web/worker';
import { schema } from './schema';

makeWorker({
  schema,
  // Add sync backend configuration here if needed in the future
  // sync: {
  //   backend: makeSomeSyncBackend({ url: import.meta.env.VITE_LIVESTORE_SYNC_URL }),
  //   initialSyncOptions: { _tag: 'Blocking', timeout: 5000 },
  // },
});
