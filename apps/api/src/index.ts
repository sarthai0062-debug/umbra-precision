import { appConfig } from "./config.js";
import { createApp } from "./app.js";
import { logger } from "./logger.js";
import { runRetryPass } from "./operations.js";

const app = createApp();

setInterval(() => {
  runRetryPass();
}, 10_000);

app.listen(appConfig.port, () => {
  logger.info({ port: appConfig.port }, "API listening");
});
