import type { Context } from "telegraf";

// Beri margin dari limit asli Telegram (4096 karakter per pesan)
const TELEGRAM_TEXT_LIMIT = 3800;

// Kalau output pendek, kirim sebagai teks biasa. Kalau panjang (log 1500 baris
// biasanya jauh melebihi limit chat), kirim sebagai file .log supaya tidak
// terpotong dan lebih nyaman dibaca/didownload user.
export async function sendLongMessage(ctx: Context, title: string, body: string): Promise<void> {
  await ctx.reply(title);

  const trimmed = body.trim() || "(tidak ada output)";

  if (trimmed.length <= TELEGRAM_TEXT_LIMIT) {
    await ctx.reply(trimmed);
    return;
  }

  await ctx.replyWithDocument({
    source: Buffer.from(trimmed, "utf-8"),
    filename: `output-${Date.now()}.log`,
  });
}
