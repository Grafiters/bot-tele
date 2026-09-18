import { Markup } from "telegraf";
import type { Context } from "telegraf";
import { getServices, findService } from "../service-registry";
import { runRemoteCommand } from "../ssh-client";
import { sendLongMessage } from "../utils/send-long-message";

function serviceKeyboard(prefix: string) {
  return Markup.inlineKeyboard(
    getServices().map((service) => [Markup.button.callback(service.id, `${prefix}:${service.id}`)])
  );
}

export async function handleLogCommand(ctx: Context): Promise<void> {
  await ctx.reply("Pilih service yang ingin dicek lognya:", serviceKeyboard("log"));
}

export async function handleLogCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery && "data" in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
  const id = data?.split(":")[1];
  const service = findService(id);

  if (!service) {
    await ctx.answerCbQuery("Service tidak dikenali");
    return;
  }

  await ctx.answerCbQuery();
  await ctx.reply(`Mengambil log "${service.id}" (container: ${service.logService}, tail 1500 baris)...`);

  try {
    const { stdout, stderr, code } = await runRemoteCommand(`make log SERVICE=${service.logService}`);
    const output = stdout || stderr;
    await sendLongMessage(ctx, `Log "${service.id}" (exit code ${code}):`, output);
  } catch (error) {
    await ctx.reply(`Gagal mengambil log "${service.id}": ${(error as Error).message}`);
  }
}
