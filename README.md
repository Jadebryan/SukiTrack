# SukiTrack

Offline-friendly **React Native (Expo)** app for sari-sari stores to track **utang** and **bayad**. Data lives in **MongoDB** through a small **Node + Express + Mongoose** API. The mobile app caches the last sync in **AsyncStorage** and refreshes on pull-to-refresh, polling, and when the network comes back.

> App folder: `utang-tracker-ph/` (use this path in terminal / Cursor).

## Architecture

| Piece | Role |
|--------|------|
| `utang-tracker-ph/` | Expo app (Expo Router, Paper, email/password + PIN) |
| `utang-tracker-ph/server/` | REST API + MongoDB writes |
| **JWT** (`Authorization: Bearer …`) | Authenticates the user; `ownerId` on the user scopes all rows |

Firebase is **not** used.

### Account & first-time flow

1. **Welcome** → **Create account** (email + password, min. 8 characters) or **Sign in**.
2. After a successful sign-in, **set up your PIN** (local lock on this device).
3. Next launches: enter PIN to unlock. **Forgot PIN?** → sign in with email/password again → set a new PIN (old local PIN is cleared).
4. **Settings** → **Change password** (needs current password). **Sign out** clears the session; sign in again with email/password.
5. **Settings** → **Language** → **English** (default) or **Filipino** (Tagalog). Restarts labels only; API error messages from the server may stay in Filipino until the server is localized.

**Pahina ng utang (sheet) + resibo**

- Bawat customer ay may **isang aktibong pahina** (parang isang sheet ng papel): lahat ng **item** ay nakalista roon; **magbayad** bawas sa pahina na iyon.
- Kapag **fully paid** na ang pahina (kabuuang bayad ≥ subtotal ng items), **sarado** na ito at lumilipat sa **Naka-archive (lunas na)**. Puwede pa ring **i-print** ang buong pahina (lista + bayad + **LUNAS**).
- Bagong **Dagdag item** pagkatapos mag-lunas ay **bagong pahina** na.

**Note:** Data created before email accounts were added used random `ownerId` values and is **not** linked to new user accounts. New registrations get a server-assigned `ownerId`.

**Lumang data:** Ang API ay **utang pages** na ang ginagamit (`/pages/items`, `/pages/payments`). Ang dating `transactions` sa bootstrap ay **wala na**; lumang `Transaction` docs sa MongoDB ay hindi na lalabas sa app maliban kung mag-migrate ka nang manual.

## Quick start

### 1. MongoDB

- **Local:** install [MongoDB Community](https://www.mongodb.com/try/download/community) or use Docker, default `mongodb://127.0.0.1:27017/utang_tracker_ph`.
- **Cloud:** create a free cluster on [MongoDB Atlas](https://www.mongodb.com/atlas), get a connection string, allow your IP (or `0.0.0.0/0` for testing only).

Ang laman ng database ay **mula lang sa totoong entrada mo sa app** (customers, pahina ng utang). Walang auto-generated na halimbawa. Kung may natirang demo data dati, burahin ang customers sa app o linisin ang collections sa MongoDB Compass / Atlas.

### 2. Run the API

```bash
cd utang-tracker-ph/server
cp .env.example .env
# Edit .env: MONGODB_URI, JWT_SECRET (required in production), PORT optional
npm install
npm start
```

Default: `http://0.0.0.0:3847` — routes are under `/api/v1/...`.

### 3. Configure the Expo app

```bash
cd utang-tracker-ph
npm install
cp .env.example .env
```

Set **`EXPO_PUBLIC_API_URL`**:

- **Android emulator:** `http://10.0.2.2:3847/api/v1`
- **Physical phone on same Wi‑Fi:** `http://YOUR_PC_IP:3847/api/v1` (Windows firewall may need to allow the port)

### 4. Start Expo

```bash
npx expo start
```

Register or sign in, create a PIN, then add customers and utang pages (items + payments).

## API endpoints (reference)

**Auth (no Bearer):**

| Method | Path | Body | Purpose |
|--------|------|------|---------|
| POST | `/api/v1/auth/register` | `{ email, password }` | Create account; returns JWT + `ownerId` |
| POST | `/api/v1/auth/login` | `{ email, password }` | Returns JWT + `ownerId` |

**Authenticated** routes need **`Authorization: Bearer <jwt>`** (the app sends this after login).

| Method | Path | Purpose |
|--------|------|---------|
| POST | `/api/v1/auth/change-password` | `{ currentPassword, newPassword }` |
| GET | `/api/v1/bootstrap` | All customers + **pages** (open + paid utang sheets) |
| POST | `/api/v1/customers` | Create customer |
| DELETE | `/api/v1/customers/:id` | Delete customer + all their pages |
| POST | `/api/v1/customers/:id/pages/items` | Add line item to current open page (creates page if needed); body `{ amount, description?, note? }` |
| POST | `/api/v1/customers/:id/pages/payments` | Pay toward open page; closes page when fully paid; body `{ amount, note? }` |

## Troubleshooting

- **`Cannot POST /api/v1/customers/.../pages/items` (404):** Ang tumatakbo mong API ay **lumang process** o ibang folder. I-stop ang lahat ng `node` para sa API, tapos sa terminal: `cd utang-tracker-ph/server` → `npm start`. Dapat gumana ang `GET http://YOUR_IP:3847/api/v1/health` at may JSON na `"pagesApi": true`. Ang **`npm start` sa root ng Expo app** ay hindi nagpa-patay ng API — kailangan hiwalay na terminal para sa server.
- If Expo asks to install **TypeScript** at startup: this app is **JavaScript-only**; there is no `tsconfig.json`. Answer **n** (or restart after pulling latest). Path aliases use `jsconfig.json`.
- **Do not run** `npm audit fix --force` on this project. It can **downgrade Expo** (e.g. to SDK 49) and break Metro while leaving incompatible packages. Moderate `postcss` / `expo` audit noise is common; Expo tracks fixes in newer SDKs.
- If you already ran it and `expo start` fails: restore **`expo": "~54.0.x"`** in `package.json`, run **`npm install`**, then **`npx expo install --fix`** (optional).

## Production / security notes

- Set a strong **`JWT_SECRET`** in production; without it the server will refuse to start when `NODE_ENV=production`.
- Use **HTTPS** and host the API on Railway, Render, Fly.io, VPS, etc.
- **PIN** only protects the app UI on the device; the API is protected by **JWT**.

## Building an APK

Same as before: use **EAS Build** with `eas.json` (e.g. `eas build -p android --profile preview`). Point **`EXPO_PUBLIC_API_URL`** at your public API URL for release builds.

## Folder structure (app)

```
app/            # Expo Router
components/
constants/      # apiConfig.js, theme, thresholds
contexts/       # Auth, theme, ShopData (Mongo sync + cache)
hooks/
screens/
services/       # apiClient, remoteApi, customersService, pagesService, …
server/         # Express + Mongoose
```
