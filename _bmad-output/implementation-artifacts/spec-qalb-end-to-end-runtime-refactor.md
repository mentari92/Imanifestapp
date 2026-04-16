---
title: 'Qalb End-to-End Runtime Refactor'
type: 'refactor'
created: '2026-04-16'
status: 'draft'
context:
  - '{project-root}/Brain/01-project-brief.md'
---

<frozen-after-approval reason="human-owned intent — do not modify unless human renegotiates">

## Intent

**Problem:** Fitur Qalb masih terasa tidak berfungsi di runtime: submit bisa macet, result dapat kosong/hilang setelah navigasi atau reload, dan alur voice/text belum cukup andal untuk demo web menjelang submission.

**Approach:** Refactor Qalb sebagai satu flow end-to-end yang reliabel dengan mempertahankan visual holographic yang ada, mengunci submit/result hydration di frontend, dan membuat backend ImanSync fail-fast dengan fallback demo-safe saat layanan eksternal lambat atau gagal.

## Boundaries & Constraints

**Always:** Pertahankan visual direction dan layout utama Qalb/Qalb Result; gunakan route aktif yang sudah ada; prioritaskan Expo Web demo stability; hasil submit harus tetap muncul walau AI/Quran API lambat; perubahan harus terfokus pada Qalb flow saja.

**Ask First:** Jika refactor membutuhkan perubahan product scope di luar Qalb, penggantian API domain utama, atau penghapusan pola desain holographic yang sedang dipakai.

**Never:** Jangan rewrite seluruh aplikasi; jangan memindahkan Qalb ke fitur lain yang mengubah user journey; jangan menambah dependency baru untuk menyelesaikan reliability dasar; jangan menyentuh flow Imanifest, Dua-to-Do, atau Tafakkur pada story ini.

## I/O & Edge-Case Matrix

| Scenario | Input / State | Expected Output / Behavior | Error Handling |
|----------|--------------|---------------------------|----------------|
| Text submit succeeds | User mengetik refleksi lalu submit | Route pindah ke result dan menampilkan ayat + summary aktual | N/A |
| AI/Quran provider slow | Submit berjalan tetapi provider melampaui timeout | User tetap menerima guidance fallback yang layak demo | Tampilkan pesan soft-fallback, bukan blank state permanen |
| Result page reload | User reload halaman result di web | Data result tetap ter-hydrate dari payload/storage | Jika storage parse gagal, tampilkan empty fallback yang eksplisit |
| Voice unsupported | Browser tidak mendukung speech recognition | User tetap bisa lanjut dengan input teks | Tampilkan pesan fallback ke text input |
| Empty submit | User submit tanpa isi refleksi | Tidak ada request ke server | Tampilkan validation error lokal |

</frozen-after-approval>

## Code Map

- `apps/mobile-web/app/(tabs)/qalb.tsx` -- screen input utama Qalb; harus mengunci validation, submit, voice fallback, dan route params.
- `apps/mobile-web/app/qalb-result.tsx` -- screen hasil; harus membaca data dari store/payload secara tahan reload.
- `apps/mobile-web/hooks/useImanSync.ts` -- hook submit Qalb ke backend; harus punya kontrak return/error yang stabil.
- `apps/mobile-web/lib/imanSyncStore.ts` -- penyimpanan hasil analyze sementara; harus mendukung persistence web.
- `apps/mobile-web/lib/api.ts` -- client API Qalb; harus tahan base URL/runtime network issue untuk demo.
- `apps/server/src/iman-sync/iman-sync.service.ts` -- orchestrator backend Qalb; harus fail-fast dan mengembalikan fallback demo-safe.

## Tasks & Acceptance

**Execution:**
- [ ] `apps/mobile-web/app/(tabs)/qalb.tsx` -- rapikan submit flow text/voice, validation, fallback messaging, dan route payload -- agar input screen selalu menghasilkan transisi yang deterministik ke result.
- [ ] `apps/mobile-web/app/qalb-result.tsx` + `apps/mobile-web/lib/imanSyncStore.ts` -- pastikan hydration result tahan navigasi dan reload web -- agar hasil Qalb tidak hilang atau tampak blank setelah submit.
- [ ] `apps/mobile-web/hooks/useImanSync.ts` + `apps/mobile-web/lib/api.ts` -- tetapkan kontrak hook/API yang stabil untuk success, timeout, dan fallback -- agar frontend tidak bergantung pada kondisi jaringan ideal.
- [ ] `apps/server/src/iman-sync/iman-sync.service.ts` -- refactor pipeline analyze menjadi fail-fast dengan fallback ayat/summary aman -- agar endpoint tetap responsif untuk demo meski provider eksternal lambat.
- [ ] `apps/server/src/iman-sync/iman-sync.service.ts` and relevant verification paths -- tambah/rapikan verification untuk edge cases timeout/fallback dan jalankan typecheck/smoke checks -- agar skenario matrix di atas benar-benar tervalidasi.

**Acceptance Criteria:**
- Given user berada di Qalb dan mengisi refleksi teks, when menekan submit, then result screen terbuka dengan summary dan minimal satu guidance payload yang terbaca user.
- Given provider AI atau Quran lambat, when timeout tercapai, then endpoint tetap mengembalikan fallback guidance tanpa membuat UI menggantung tanpa akhir.
- Given user sudah tiba di Qalb Result, when halaman direload di web, then result tetap tampil dari payload tersimpan atau fallback yang valid.
- Given browser tidak mendukung voice recognition, when user mencoba mode voice, then user diarahkan ke input teks tanpa memblokir flow utama.
- Given text input kosong, when user submit, then request tidak dikirim dan error validasi lokal tampil.

## Design Notes

Refactor ini bukan redesign. Golden rule-nya: pertahankan komposisi visual Qalb yang sudah sesuai brief, tetapi ganti bagian yang masih “prototype behavior” menjadi runtime behavior. Pada demo hackathon, respons yang sedikit generik namun cepat dan stabil lebih baik daripada pengalaman yang lebih “pintar” tetapi blank, timeout, atau terasa mati.

## Verification

**Commands:**
- `corepack pnpm --filter mobile-web exec tsc --noEmit` -- expected: frontend Qalb changes compile cleanly.
- `corepack pnpm --filter server exec tsc --noEmit` -- expected: backend ImanSync refactor compiles cleanly.
- `curl -sS -m 12 -X POST http://localhost:3001/iman-sync/analyze -H 'Content-Type: application/json' -H 'Authorization: Bearer demo_token_high_vibration_888' -d '{"intentText":"Saya takut tidak lolos deadline submit tanggal 19"}'` -- expected: endpoint returns JSON guidance within timeout budget.
- Manual web check -- expected: text submit opens result, reload preserves result, unsupported voice falls back to text path.
