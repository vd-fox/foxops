# Foxchange Device Handover

Internal tool for dispatchers to issue/return PDAs and mobile printers using Supabase Auth + Storage and Next.js App Router.

## Stack
- Next.js 14 (App Router, TypeScript)
- Supabase (Auth, Postgres, Storage)
- Tailwind CSS

## Getting started
1. **Install deps**
   ```bash
   npm install
   ```
2. **Environment** – copy `.env.example` → `.env.local` and fill in:
   ```bash
   NEXT_PUBLIC_SUPABASE_URL=your-project-url
   NEXT_PUBLIC_SUPABASE_ANON_KEY=public-anon-key
   SUPABASE_SERVICE_ROLE_KEY=service-role-key
   ```
   The service-role key is only used on the server for admin-only operations (user creation + signature uploads).
3. **Database** – run the migration using Supabase CLI:
   ```bash
   supabase db push
   ```
   This creates enums, tables (`profiles`, `devices`, `handover_batches`, `handover_logs`) and the required RLS policies.
4. **Auth + seed data**
   - Create the auth users via the Supabase Dashboard or CLI (admin x1, dispatcher x2, courier xN). Note their UUIDs.
   - Update the UUIDs in `supabase/seeds/seed.sql` if you want deterministic IDs.
   - Apply the seed script:
     ```bash
     supabase db remote commit --seed supabase/seeds/seed.sql
     ```
   - Courier PIN hashes inside the seed file were produced with `htpasswd -bnBC 12 courier <PIN>` (bcrypt, cost 12). Update them the same way when you change demo PINs.
5. **Storage bucket** – create a public bucket named `signatures` inside Supabase Storage (or rename in `lib/signature.ts`). Grant “Authenticated read/write” for dispatchers.
6. **Run dev server**
   ```bash
   npm run dev
   ```
   Visit `http://localhost:3000` → login with an admin/dispatcher email/password.

## Features
- **Auth** – Supabase email/password for admins & dispatchers. Couriers only use PIN entry on the handover UI.
- **Dashboard** – device counters + recent handovers snapshot.
- **Users** – admin CRUD, status toggle, PIN reset (secure bcrypt hashing via `bcryptjs`).
- **Devices** – search/filter, add new assets, edit detail page, see holder + history timeline.
- **Handover flows** – tablet-friendly wizard for issuing or returning multiple devices with PIN verification + signature capture. Signatures stored in Supabase Storage and linked to each batch + log.

## API overview
Route handlers live under `app/api/**` and all use the Supabase server client with RLS:
- `POST /api/users` – admin creates users (provisions Supabase Auth + profile row).
- `PATCH /api/users/:id` – admin updates details or PIN.
- `GET|POST /api/devices` & `PATCH /api/devices/:id`
- `POST /api/handover/issue` and `POST /api/handover/return` – verify courier PIN server-side, upload signature, log batch + per-device events, and update statuses.
- `GET /api/devices/:id/history` – audit trail for device view.

## Testing the flow
1. Login as dispatcher.
2. `/users` – ensure couriers exist + PINs set.
3. `/devices` – add/import PDAs & printers.
4. `/handover/checkout` – select courier → select available devices → enter courier PIN → capture signatures.
5. `/handover/checkin` – pick courier, select issued devices, repeat PIN + signature.
6. `/devices/[id]` – verify history and signature links update.

Feel free to add telemetry, tablet kiosk mode, or external barcode scanning on top of this base.
