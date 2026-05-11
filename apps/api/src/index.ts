import { appConfig } from "./config";
import { createApp } from "./app";
import { logger } from "./logger";
import { runRetryPass } from "./operations";

const app = createApp();

setInterval(() => {
  runRetryPass();
}, 10_000);

app.listen(appConfig.port, () => {
  logger.info({ port: appConfig.port }, "API listening");
});
