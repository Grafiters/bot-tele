// Mapping ini sengaja di-hardcode sesuai isi Makefile project (bukan di-scan
// otomatis dari server), karena nama repo (untuk pull), target build, target up,
// dan nama container (untuk log) semuanya berbeda-beda per service dan tidak bisa
// ditebak hanya dari nama folder.
//
// Kalau nanti Makefile berubah (ada service baru, atau target berubah nama),
// cukup update array SERVICES di bawah ini.
export interface ServiceDefinition {
  // Dipakai sebagai label tombol di Telegram & key internal (callback data)
  id: string;
  // make target untuk git pull repo terkait, contoh "pull-service-arlods"
  pullTarget: string;
  // make target untuk build image, contoh "build-service-arlods-p3".
  // Opsional -- beberapa service (misal main-service) tidak punya target build sendiri.
  buildTarget?: string;
  // make target untuk docker compose up, contoh "arlods-p3"
  upTarget: string;
  // nama container, dipakai untuk `make log SERVICE=<container>`
  logService: string;
  // Opsional: kalau Makefile sudah punya target deploy-* sendiri (yang di
  // dalamnya menjalankan pull -> build -> up), /deploy cukup panggil target
  // tunggal ini. Kalau tidak diisi, bot menyusun langkahnya sendiri dari
  // pullTarget (+ buildTarget kalau ada) + upTarget.
  deployTarget?: string;
}

export const SERVICES: ServiceDefinition[] = [
  {
    id: "service-arlods",
    pullTarget: "pull-service-arlods",
    buildTarget: "build-service-arlods-p3",
    upTarget: "arlods-p3",
    logService: "service-arlods-p3",
    deployTarget: "deploy-service-arlods",
  },
  {
    id: "main-service",
    pullTarget: "pull-opra-main-service-bri",
    // tidak ada target build atau deploy khusus untuk main-service di Makefile
    upTarget: "main-service",
    logService: "main-service",
  },
  {
    id: "main-ui",
    pullTarget: "pull-opra-main-ui",
    buildTarget: "build-main-ui-p3",
    upTarget: "main-ui-p3",
    logService: "main-ui-p3",
    deployTarget: "deploy-opra-main-ui",
  },
  {
    id: "bcv-ui",
    pullTarget: "pull-bcv-ui",
    buildTarget: "build-bcv-ui-p3",
    upTarget: "bcv-ui-p3",
    logService: "bcv-ui-p3",
    deployTarget: "deploy-bcv-ui",
  },
];

export function findService(id: string | undefined): ServiceDefinition | undefined {
  if (!id) return undefined;
  return SERVICES.find((service) => service.id === id);
}
