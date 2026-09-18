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

export async function handleRunCommand(ctx: Context): Promise<void> {
  await ctx.reply("Pilih service yang ingin di-up ulang (docker compose up --force-recreate):", serviceKeyboard("run-select"));
}

export async function handleRunSelectCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery && "data" in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
  const id = data?.split(":")[1];
  const service = findService(id);

  if (!service) {
    await ctx.answerCbQuery("Service tidak dikenali");
    return;
  }

  await ctx.answerCbQuery();
  await ctx.reply(
    `Yakin mau jalankan "make ${service.upTarget}" di server?`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Ya, jalankan", `run-confirm:${service.id}`),
        Markup.button.callback("Batal", "run-cancel"),
      ],
    ])
  );
}

export async function handleRunConfirmCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery && "data" in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
  const id = data?.split(":")[1];
  const service = findService(id);

  if (!service) {
    await ctx.answerCbQuery("Service tidak dikenali");
    return;
  }

  await ctx.answerCbQuery();

  const actor = ctx.from ? `${ctx.from.id} (${ctx.from.username ?? "no-username"})` : "unknown";
  console.log(`[audit] ${new Date().toISOString()} - ${actor} menjalankan "make ${service.upTarget}"`);

  await ctx.editMessageText(`Menjalankan "make ${service.upTarget}"...`);

  try {
    const { stdout, stderr, code } = await runRemoteCommand(`make ${service.upTarget}`);
    const output = stdout || stderr;
    await sendLongMessage(ctx, `Hasil "make ${service.upTarget}" (exit code ${code}):`, output);
  } catch (error) {
    await ctx.reply(`Gagal menjalankan "make ${service.upTarget}": ${(error as Error).message}`);
  }
}

export async function handleRunCancelCallback(ctx: Context): Promise<void> {
  await ctx.answerCbQuery("Dibatalkan");
  await ctx.editMessageText("Dibatalkan.");
}
