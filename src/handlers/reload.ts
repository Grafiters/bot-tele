import type { Context } from "telegraf";
import { reloadServices } from "../service-registry";

export async function handleReloadCommand(ctx: Context): Promise<void> {
  try {
    const services = reloadServices();
    const list = services.map((s) => `- ${s.id}`).join("\n");
    await ctx.reply(`Config berhasil di-reload. Total service: ${services.length}\n\n${list}`);
  } catch (error) {
    await ctx.reply(
      `Gagal reload config/services.yml:\n${(error as Error).message}\n\n` +
        `Service lama tetap dipakai sampai file config diperbaiki.`
    );
  }
}
