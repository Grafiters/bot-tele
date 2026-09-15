import "dotenv/config";

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Environment variable ${name} wajib diisi (cek file .env)`);
  }
  return value;
}

const projectDir = required("SERVER_PROJECT_DIR");

export const config = {
  botToken: required("BOT_TOKEN"),

  ssh: {
    host: required("SSH_HOST"),
    port: Number(process.env.SSH_PORT ?? 22),
    username: required("SSH_USERNAME"),
    password: required("SSH_PASSWORD"),
  },

  // Direktori project di server, tempat Makefile berada (ini yang jadi cwd
  // untuk semua command `make ...` yang dijalankan bot)
  projectDir,

  // Daftar chat ID (grup/user) yang boleh pakai bot ini, pisahkan dengan koma
  allowedChatIds: required("ALLOWED_CHAT_IDS")
    .split(",")
    .map((id) => id.trim())
    .filter(Boolean)
    .map(Number),

  // Batas waktu eksekusi command di server (ms), supaya bot tidak hang selamanya
  commandTimeoutMs: Number(process.env.COMMAND_TIMEOUT_MS ?? 60_000),
};
