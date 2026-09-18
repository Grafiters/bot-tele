import fs from "node:fs";
import path from "node:path";
import YAML from "yaml";

// Hanya izinkan huruf, angka, titik, dash, underscore -- semua field di YAML
// ini dipakai langsung untuk membangun command shell (make <target>), jadi
// tetap divalidasi supaya tidak ada celah command injection walaupun sumbernya
// dari file config, bukan input Telegram.
const SAFE_VALUE = /^[A-Za-z0-9_.-]+$/;

export interface ServiceDefinition {
  id: string;
  pullTarget: string;
  buildTarget?: string;
  upTarget: string;
  logService: string;
  deployTarget?: string;
}

interface RawServiceEntry {
  id?: string;
  pull?: string;
  build?: string;
  up?: string;
  log?: string;
  deploy?: string;
}

interface RawConfig {
  services?: RawServiceEntry[];
}

const CONFIG_PATH = process.env.SERVICES_CONFIG_PATH
  ? path.resolve(process.env.SERVICES_CONFIG_PATH)
  : path.resolve(process.cwd(), "config", "services.yml");

function validate(value: string | undefined, field: string, serviceId: string): string | undefined {
  if (value === undefined) return undefined;

  if (!SAFE_VALUE.test(value)) {
    throw new Error(
      `Field "${field}" pada service "${serviceId}" mengandung karakter tidak valid: "${value}" ` +
        `(hanya boleh huruf, angka, titik, dash, underscore)`
    );
  }

  return value;
}

function loadServices(): ServiceDefinition[] {
  let raw: string;

  try {
    raw = fs.readFileSync(CONFIG_PATH, "utf-8");
  } catch (error) {
    throw new Error(`Gagal membaca file config service di ${CONFIG_PATH}: ${(error as Error).message}`);
  }

  let parsed: RawConfig;

  try {
    parsed = (YAML.parse(raw) as RawConfig) ?? {};
  } catch (error) {
    throw new Error(`Gagal parse ${CONFIG_PATH} sebagai YAML: ${(error as Error).message}`);
  }

  if (!Array.isArray(parsed.services) || parsed.services.length === 0) {
    throw new Error(`${CONFIG_PATH} tidak valid: field "services" wajib berupa list yang tidak kosong`);
  }

  const services = parsed.services.map((entry, index) => {
    const context = entry.id ?? `index ${index}`;

    if (!entry.id) throw new Error(`services[${index}] di ${CONFIG_PATH} wajib punya field "id"`);
    if (!entry.pull) throw new Error(`Service "${context}" wajib punya field "pull"`);
    if (!entry.up) throw new Error(`Service "${context}" wajib punya field "up"`);
    if (!entry.log) throw new Error(`Service "${context}" wajib punya field "log"`);

    const id = validate(entry.id, "id", context)!;

    return {
      id,
      pullTarget: validate(entry.pull, "pull", context)!,
      buildTarget: validate(entry.build, "build", context),
      upTarget: validate(entry.up, "up", context)!,
      logService: validate(entry.log, "log", context)!,
      deployTarget: validate(entry.deploy, "deploy", context),
    };
  });

  const ids = services.map((s) => s.id);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length > 0) {
    throw new Error(`${CONFIG_PATH} punya id service duplikat: ${[...new Set(duplicates)].join(", ")}`);
  }

  return services;
}

// Dimuat sekali saat startup. Kalau file YAML rusak/tidak ada, bot sengaja
// langsung gagal start (fail fast) supaya error konfigurasi ketahuan dari awal,
// bukan baru muncul saat user pertama kali klik /log atau /deploy.
let cachedServices: ServiceDefinition[] = loadServices();

export function getServices(): ServiceDefinition[] {
  return cachedServices;
}

// Dipanggil oleh command /reload supaya perubahan di services.yml langsung
// kepakai tanpa perlu restart container.
export function reloadServices(): ServiceDefinition[] {
  cachedServices = loadServices();
  return cachedServices;
}

export function findService(id: string | undefined): ServiceDefinition | undefined {
  if (!id) return undefined;
  return cachedServices.find((service) => service.id === id);
}
