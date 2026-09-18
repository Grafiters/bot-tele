import { Markup } from "telegraf";
import type { Context } from "telegraf";
import { getServices, findService, type ServiceDefinition } from "../service-registry";
import { runRemoteCommand } from "../ssh-client";
import { sendLongMessage } from "../utils/send-long-message";

function serviceKeyboard(prefix: string) {
  return Markup.inlineKeyboard(
    getServices().map((service) => [Markup.button.callback(service.id, `${prefix}:${service.id}`)])
  );
}

export async function handleDeployCommand(ctx: Context): Promise<void> {
  await ctx.reply(
    "Pilih service yang ingin di-deploy:",
    serviceKeyboard("deploy-select")
  );
}

// Kalau service punya deployTarget di config/services.yml (Makefile sudah
// punya target deploy-* sendiri yang mencakup pull -> build -> up), cukup
// jalankan 1 command itu. Kalau tidak diisi, bot susun sendiri dari
// pullTarget (+ buildTarget kalau ada) + upTarget.
function deploySteps(service: ServiceDefinition) {
  if (service.deployTarget) {
    return [{ label: "deploy", command: `make ${service.deployTarget}` }];
  }

  const steps = [{ label: "pull", command: `make ${service.pullTarget}` }];

  if (service.buildTarget) {
    steps.push({ label: "build", command: `make ${service.buildTarget}` });
  }

  steps.push({ label: "up", command: `make ${service.upTarget}` });

  return steps;
}

export async function handleDeploySelectCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery && "data" in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
  const id = data?.split(":")[1];
  const service = findService(id);

  if (!service) {
    await ctx.answerCbQuery("Service tidak dikenali");
    return;
  }

  await ctx.answerCbQuery();

  const steps = deploySteps(service);
  const stepList = steps.map((step, i) => `${i + 1}. ${step.command}`).join("\n");

  await ctx.reply(
    `Yakin mau deploy "${service.id}"?\n\n` +
      `Urutan yang akan dijalankan:\n${stepList}\n\n` +
      `Kalau salah satu step gagal, proses akan dihentikan (step berikutnya tidak dijalankan).`,
    Markup.inlineKeyboard([
      [
        Markup.button.callback("Ya, deploy", `deploy-confirm:${service.id}`),
        Markup.button.callback("Batal", "deploy-cancel"),
      ],
    ])
  );
}

export async function handleDeployConfirmCallback(ctx: Context): Promise<void> {
  const data = ctx.callbackQuery && "data" in ctx.callbackQuery ? ctx.callbackQuery.data : undefined;
  const id = data?.split(":")[1];
  const service = findService(id);

  if (!service) {
    await ctx.answerCbQuery("Service tidak dikenali");
    return;
  }

  await ctx.answerCbQuery();

  const actor = ctx.from ? `${ctx.from.id} (${ctx.from.username ?? "no-username"})` : "unknown";
  console.log(`[audit] ${new Date().toISOString()} - ${actor} men-deploy "${service.id}"`);

  await ctx.editMessageText(`Memulai deploy "${service.id}"...`);

  const steps = deploySteps(service);

  for (const [index, step] of steps.entries()) {
    const stepNumber = index + 1;
    await ctx.reply(`[${stepNumber}/${steps.length}] Menjalankan: ${step.command}`);

    try {
      const { stdout, stderr, code } = await runRemoteCommand(step.command);
      const output = stdout || stderr;

      await sendLongMessage(ctx, `Hasil "${step.command}" (exit code ${code}):`, output);

      if (code !== 0) {
        await ctx.reply(
          `Deploy "${service.id}" dihentikan karena step "${step.label}" gagal (exit code ${code}).`
        );
        return;
      }
    } catch (error) {
      await ctx.reply(
        `Deploy "${service.id}" dihentikan. Step "${step.label}" error: ${(error as Error).message}`
      );
      return;
    }
  }

  await ctx.reply(`Deploy "${service.id}" selesai. Semua step berhasil.`);
}

export async function handleDeployCancelCallback(ctx: Context): Promise<void> {
  await ctx.answerCbQuery("Dibatalkan");
  await ctx.editMessageText("Deploy dibatalkan.");
}
