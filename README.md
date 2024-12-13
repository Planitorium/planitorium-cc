# Planitorium CC

## Persyaratan
Sebelum memulai, pastikan Anda memiliki:
- **WSL (Windows Subsystem for Linux)** yang terpasang pada sistem Windows Anda.
- **Ubuntu untuk WSL** sebagai lingkungan terminal Linux.
- **Node.js** dan **npm** terinstal di sistem Anda.
- Akses ke Google Cloud untuk mendapatkan URL model AI.

## Langkah Instalasi
Ikuti langkah-langkah berikut untuk menyiapkan proyek:

1. **Pasang WSL dan Ubuntu:**
   - Unduh dan instal [WSL](https://docs.microsoft.com/en-us/windows/wsl/install) di sistem Windows Anda.
   - Dari Microsoft Store, instal distribusi Ubuntu.

2. **Inisialisasi Proyek Node.js:**
   Buka terminal WSL dan jalankan perintah berikut:
   ```bash
   npm init --y
   ```

3. **Pasang Dependensi Proyek:**
   Instal pustaka yang diperlukan dengan menjalankan:
   ```bash
   npm install @hapi/hapi @tensorflow/tfjs-node @google-cloud/firestore dotenv
   ```

4. **Pasang Nodemon:**
   Tambahkan Nodemon untuk pengembangan dengan perintah:
   ```bash
   npm install nodemon --save-dev
   ```

5. **Konfigurasi File Lingkungan (.env):**
   - Buat file `.env` di direktori root proyek.
   - Tambahkan konfigurasi berikut:
     ```env
     MODEL_URL='<PUBLIC_URL_MODEL>'
     ```
   - Ganti `<PUBLIC_URL_MODEL>` dengan URL model publik Anda dari Google Cloud.

6. **Jalankan Proyek:**
   Gunakan perintah berikut untuk menjalankan proyek dalam mode pengembangan:
   ```bash
   npm run start:dev
   ```

## Skrip NPM
- **`start:dev`**: Menjalankan proyek dalam mode pengembangan menggunakan Nodemon.

## Teknologi yang Digunakan
- **@hapi/hapi:** Framework untuk membangun server HTTP.
- **@tensorflow/tfjs-node:** Pustaka TensorFlow untuk Node.js.
- **@google-cloud/firestore:** Layanan Google Cloud Firestore.
- **dotenv:** Untuk pengelolaan variabel lingkungan.

## Catatan Tambahan
- Pastikan semua dependensi telah terinstal dengan benar.
- Pastikan Anda menjalankan semua perintah dari terminal WSL.


