# Telegram Log & Deploy Bot

Bot Telegram untuk cek log, up ulang service, dan deploy service di server,
sesuai target-target yang ada di Makefile project.

## Menambah/mengubah service

Semua service dikonfigurasi di **`config/services.yml`** — bukan di kode.
Untuk menambah service baru, tinggal tambah entry baru di file itu, contoh:

```yaml
services:
  - id: nama-service-baru
    pull: pull-nama-repo       # wajib
    build: build-target-image  # opsional
    up: nama-target-up         # wajib
    log: nama-container        # wajib, dipakai untuk `make log SERVICE=...`
    deploy: deploy-nama-service # opsional, kalau sudah ada target deploy-* di Makefile
```

Setelah diedit, kirim `/reload` ke bot supaya perubahan langsung kepakai
**tanpa perlu restart container**.

Isi default `config/services.yml` saat ini, sesuai Makefile project:

| Service (tombol) | pull | build | up | log SERVICE= | deploy |
|---|---|---|---|---|---|
| service-arlods | `pull-service-arlods` | `build-service-arlods-p3` | `arlods-p3` | `service-arlods-p3` | `deploy-service-arlods` (1 step) |
| main-service | `pull-opra-main-service-bri` | *(tidak ada)* | `main-service` | `main-service` | *(disusun manual: pull -> up)* |
| main-ui | `pull-opra-main-ui` | `build-main-ui-p3` | `main-ui-p3` | `main-ui-p3` | `deploy-opra-main-ui` (1 step) |
| bcv-ui | `pull-bcv-ui` | `build-bcv-ui-p3` | `bcv-ui-p3` | `bcv-ui-p3` | `deploy-bcv-ui` (1 step) |
| main-ui-p2 | `pull-opra-main-ui-p2` | `build-main-ui-p2` | `main-ui-p2` | `main-ui-p2` | `deploy-main-ui-p2` (1 step) |
| bcv-ui-p2 | `pull-bcv-ui-p2` | `build-bcv-ui-p2` | `bcv-ui-p2` | `bcv-ui-p2` | `deploy-bcv-ui-p2` (1 step) |

> Catatan: `main-service-p2` sengaja belum ditambahkan sebagai service di bot,
> karena target `make main-service-p2` ada di Makefile tapi service tersebut
> belum terdefinisi di `docker-compose.yml` — akan gagal kalau dijalankan.
> Tambahkan manual di `config/services.yml` begitu service-nya sudah ada di compose.

## Cara kerja

- `/services` → menampilkan mapping pull/build/up/log/deploy di atas langsung
  dari `config/services.yml` (tidak perlu SSH).
- `/reload` → baca ulang `config/services.yml` tanpa restart container. Kalau
  file rusak/format salah, bot memberi tahu errornya dan tetap memakai
  konfigurasi lama sampai file diperbaiki.
- `/log` → tombol pilihan service → bot SSH ke server dan jalankan
  `make log SERVICE=<container>` (tail 1500 baris sesuai target `log` di Makefile).
- `/run` → tombol pilihan service → minta konfirmasi → bot jalankan
  `make <up-target>` (docker compose up --force-recreate untuk container terkait).
- `/deploy` → tombol pilihan service → minta konfirmasi → bot jalankan:
  - **Kalau field `deploy` diisi di `services.yml`** — bot cukup jalankan
    **1 command** `make <deploy-target>` itu saja, karena target tersebut di
    Makefile sudah mencakup pull -> build -> up.
  - **Kalau field `deploy` dikosongkan** (saat ini `main-service`) — bot
    menyusun sendiri langkahnya: `make <pull-target>` (+ `make <build-target>`
    kalau diisi) lalu `make <up-target>`.

  Kalau ada step yang gagal (exit code bukan 0) atau error koneksi, proses
  langsung dihentikan dan step berikutnya (kalau multi-step) tidak dijalankan.
- Hanya chat ID yang ada di `ALLOWED_CHAT_IDS` yang bisa memakai bot ini.
- **User tidak pernah mengetik nama service atau command apa pun** — semua
  interaksi (`/log`, `/run`, `/deploy`) berbentuk tombol, dan command shell
  yang dijalankan selalu berasal dari `config/services.yml`, bukan dari input
  bebas di chat. Nilai di file itu juga tetap divalidasi (hanya huruf/angka/
  titik/dash/underscore) sebelum dipakai membangun command shell, sebagai
  lapis keamanan tambahan kalau file config diedit sembarangan.

## Setup

1. Buat bot lewat [@BotFather](https://t.me/BotFather), simpan token-nya.
2. Salin `.env.example` menjadi `.env`, isi semua variabel:
   - `BOT_TOKEN`
   - `SSH_HOST`, `SSH_PORT`, `SSH_USERNAME`, `SSH_PASSWORD`
   - `SERVER_PROJECT_DIR` — folder di server tempat Makefile berada
   - `ALLOWED_CHAT_IDS` — chat ID grup/personal yang diizinkan
3. Cara mendapatkan chat ID grup: tambahkan bot ke grup, kirim pesan apa saja,
   lalu cek lewat `https://api.telegram.org/bot<TOKEN>/getUpdates` — lihat field
   `chat.id` (biasanya berupa angka negatif untuk grup).
4. Sesuaikan `config/services.yml` kalau perlu (defaultnya sudah mengikuti
   Makefile project ini). File ini otomatis di-mount sebagai volume lewat
   `docker-compose.yml`, jadi edit file-nya lalu kirim `/reload` ke bot — tidak
   perlu `docker compose build` ulang.

## Menjalankan dengan Docker

```bash
docker compose up -d --build
```

Cek log bot itu sendiri (bukan log service di server target):

```bash
docker compose logs -f telegram-log-bot
```

## Menjalankan tanpa Docker (untuk testing lokal)

```bash
npm install
npm run dev
```

## Catatan keamanan & hal yang sengaja disederhanakan

- **Autentikasi SSH pakai password.** Ini paling gampang untuk mulai, tapi kalau
  memungkinkan, sebaiknya pindah ke key-based auth (private key + passphrase)
  supaya password tidak tersimpan sebagai plaintext di `.env`/container.
  Kalau mau ganti ke private key, cukup ubah `ssh-client.ts` bagian `ssh.connect()`
  dari `password` ke `privateKey`/`privateKeyPath` (`node-ssh` sudah mendukung ini).
- **Whitelist berbasis chat ID grup**, bukan per-user. Artinya siapa pun yang ada
  di grup tersebut bisa menjalankan `/run` dan `/deploy`. Kalau butuh kontrol lebih
  granular (misal cuma admin grup yang boleh deploy), bisa ditambahkan pengecekan
  role user di grup lewat `ctx.getChatMember()`.
- **Audit trail** untuk `/run` dan `/deploy` baru sebatas `console.log` (siapa,
  kapan, service apa). Untuk kebutuhan produksi, sebaiknya disimpan ke file/DB
  agar tidak hilang saat container restart.
- **Tidak ada rate limiting / lock.** Kalau khawatir ada spam klik tombol yang
  memicu banyak proses `make` bersamaan untuk service yang sama, tambahkan lock
  sederhana (in-memory flag "sedang berjalan") sebelum eksekusi command berikutnya.
- **Koneksi SSH dibuka-tutup tiap kali ada request** (bukan koneksi persisten).
  Cukup untuk pemakaian ringan; kalau nanti dipakai sangat sering, pertimbangkan
  connection pooling.
- Pastikan target Makefile tidak butuh input interaktif (misal konfirmasi `y/n`
  di tengah proses), karena eksekusi lewat SSH non-interaktif tidak bisa
  menjawab prompt semacam itu.
