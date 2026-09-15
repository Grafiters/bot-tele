import { Telegraf } from "telegraf";
import { config } from "./config";
import { allowedChatsOnly } from "./auth";
import { handleLogCommand, handleLogCallback } from "./handlers/log";
import {
  handleRunCommand,
  handleRunSelectCallback,
  handleRunConfirmCallback,
  handleRunCancelCallback,
} from "./handlers/run";
import {
  handleDeployCommand,
  handleDeploySelectCallback,
  handleDeployConfirmCallback,
  handleDeployCancelCallback,
} from "./handlers/deploy";
import { handleServicesCommand } from "./handlers/services";

const bot = new Telegraf(config.botToken);

bot.use(allowedChatsOnly);

bot.start((ctx) =>
  ctx.reply(
    "Bot log & deploy siap dipakai.\n\n" +
      "/log - cek log salah satu service\n" +
      "/run - up ulang (docker compose up --force-recreate) salah satu service\n" +
      "/deploy - deploy service (pull -> build kalau ada -> up)\n" +
      "/services - lihat mapping pull/build/up/log per service"
  )
);

bot.command("log", handleLogCommand);
bot.command("run", handleRunCommand);
bot.command("deploy", handleDeployCommand);
bot.command("services", handleServicesCommand);

bot.action(/^log:/, handleLogCallback);
bot.action(/^run-select:/, handleRunSelectCallback);
bot.action(/^run-confirm:/, handleRunConfirmCallback);
bot.action("run-cancel", handleRunCancelCallback);
bot.action(/^deploy-select:/, handleDeploySelectCallback);
bot.action(/^deploy-confirm:/, handleDeployConfirmCallback);
bot.action("deploy-cancel", handleDeployCancelCallback);

bot.catch((err, ctx) => {
  console.error(`[error] update type ${ctx.updateType}:`, err);
});

bot.launch().then(() => console.log("Bot berjalan..."));

process.once("SIGINT", () => bot.stop("SIGINT"));
process.once("SIGTERM", () => bot.stop("SIGTERM"));
