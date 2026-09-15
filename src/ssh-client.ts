import { NodeSSH } from "node-ssh";
import { config } from "./config";

export interface CommandResult {
  stdout: string;
  stderr: string;
  code: number | null;
}

function timeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Command timeout setelah ${ms}ms`));
    }, ms);

    promise
      .then((result) => {
        clearTimeout(timer);
        resolve(result);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

// Membuka koneksi baru tiap kali command dijalankan, lalu ditutup lagi.
// Untuk skala pemakaian bot ini (beberapa command per menit) ini cukup;
// kalau traffic tinggi, pertimbangkan connection pooling / koneksi persisten.
export async function runRemoteCommand(command: string, cwd: string = config.projectDir): Promise<CommandResult> {
  const ssh = new NodeSSH();

  try {
    await timeout(
      ssh.connect({
        host: config.ssh.host,
        port: config.ssh.port,
        username: config.ssh.username,
        password: config.ssh.password,
        readyTimeout: 15_000,
      }),
      20_000
    );

    const result = await timeout(
      ssh.execCommand(command, { cwd }),
      config.commandTimeoutMs
    );

    return { stdout: result.stdout, stderr: result.stderr, code: result.code };
  } finally {
    ssh.dispose();
  }
}
