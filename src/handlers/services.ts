import type { Context } from "telegraf";
import { SERVICES } from "../service-registry";

export async function handleServicesCommand(ctx: Context): Promise<void> {
  const lines = SERVICES.map((service) => {
    const buildLine = service.buildTarget ? `  build:  make ${service.buildTarget}\n` : "";
    const deployLine = service.deployTarget
      ? `  deploy: make ${service.deployTarget} (1 step, sudah termasuk pull+build+up)\n`
      : `  deploy: pull -> ${service.buildTarget ? "build -> " : ""}up (disusun manual, tidak ada target deploy-* di Makefile)\n`;

    return (
      `• ${service.id}\n` +
      `  pull:   make ${service.pullTarget}\n` +
      buildLine +
      `  up:     make ${service.upTarget}\n` +
      `  log:    make log SERVICE=${service.logService}\n` +
      deployLine
    ).trimEnd();
  });

  await ctx.reply(`Service yang terdaftar di bot:\n\n${lines.join("\n\n")}`);
}
