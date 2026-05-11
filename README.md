# UmbraPrecision

Private treasury console for the Umbra Side Track hackathon: Umbra shield/unshield flows, AI treasury planning, privacy posture, playbooks, and compliance export.

## Monorepo layout

- `apps/web` — Vite + React frontend
- `apps/api` — Express API and NVIDIA MiniMax integration
- `packages/shared` — shared types and treasury helpers
- `api/index.ts` — Vercel serverless entry for the API

## Local development

```bash
npm install
cp apps/api/.env.example apps/api/.env
# Add NVIDIA_API_KEY to apps/api/.env for live AI
npm run dev:api
npm run dev:web
```

Open `http://localhost:5173`. The web app calls `http://localhost:8080/api` by default.

## Publish to GitHub

1. Confirm secrets are not tracked: `apps/api/.env` must stay local; only `apps/api/.env.example` belongs in git.
2. Run `npm test`, `npm run build`, and `npm run vercel-build` from the repo root.
3. Create an empty GitHub repository.
4. Initialize and push:

```bash
git init
git add .
git commit -m "Initial UmbraPrecision release"
git branch -M main
git remote add origin https://github.com/<your-user>/<your-repo>.git
git push -u origin main
```

## Deploy on Vercel

1. Import the GitHub repository in Vercel.
2. Set **Root Directory** to `apps/web` or leave it empty for the repository root. Both layouts are supported:
   - Repository root uses `vercel.json`
   - `apps/web` uses `apps/web/vercel.json` and installs/builds from the monorepo root
3. Vercel should read the matching `vercel.json` automatically:
   - `buildCommand`: `npm run vercel-build`
   - `outputDirectory`: `apps/web/dist`
   - `/api/*` rewrites to the serverless function in `api/index.ts`
4. Do not override the output directory to `apps/web` only; the root config builds both web and API.
5. Add environment variables in Vercel for the API runtime:

| Variable | Value |
| --- | --- |
| `ALLOWED_ORIGIN` | Your production site URL, e.g. `https://<project>.vercel.app` |
| `NVIDIA_API_KEY` | NVIDIA integrate API key |
| `ENABLE_AI` | `true` |
| `ENABLE_REAL_UMBRA` | `false` for demo mode, `true` only when running live Umbra on devnet |
| `SOLANA_NETWORK` | `devnet` |
| `SOLANA_RPC_URL` | `https://api.devnet.solana.com` |
| `SOLANA_RPC_SUBSCRIPTIONS_URL` | `wss://api.devnet.solana.com` |
| `UMBRA_INDEXER_API_ENDPOINT` | `https://utxo-indexer.api-devnet.umbraprivacy.com` |

Leave `VITE_API_BASE_URL` unset in production so the frontend uses same-origin `/api`.

6. Deploy, then open the site and confirm:
   - `GET /api/health` returns `ok: true`
   - the header shows `MiniMax M2.7` when AI is enabled
   - Phantom wallet connect works on the deployed domain

## Demo limitations

- API sessions and the operation ledger are in-memory, so serverless cold starts and multiple instances will not share state.
- `ENABLE_REAL_UMBRA=false` uses mock Umbra signatures for reliable hackathon demos.
- AI planning can take 15–30 seconds on the first request.

## Useful commands

```bash
npm test
npm run test:integration -w @umbro/api
npm run vercel-build
```
