import { app } from './app';
import { env } from './config/env';

app.listen(env.PORT, () => {
  console.info(`AliTracker API listening on port ${env.PORT}`);
});
