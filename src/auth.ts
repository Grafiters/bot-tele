import type { Context, MiddlewareFn } from "telegraf";
import { config } from "./config";

// Hanya proses update yang datang dari chat ID yang sudah di-whitelist
// (misalnya grup ops tertentu). Chat lain diabaikan tanpa balasan sama
// sekali, supaya bot tidak "membocorkan" bahwa dia bisa menjalankan command
// server ke pihak yang tidak berwenang.
export const allowedChatsOnly: MiddlewareFn<Context> = async (ctx, next) => {
  const chatId = ctx.chat?.id;

  if (chatId === undefined || !config.allowedChatIds.includes(chatId)) {
    const from = ctx.from ? `${ctx.from.id} (${ctx.from.username ?? "no-username"})` : "unknown";
    console.warn(`[auth] Akses ditolak. chatId=${chatId} from=${from}`);
    return;
  }

  return next();
};
