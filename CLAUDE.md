# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.


## Layout

Two projects, each with its own `package.json`, `node_modules`, and tooling:

- **`web/`** — Next.js 16 App Router, treated as a **pure SPA**. No route handlers, no server logic. See its own `CLAUDE.md`.
- **`api/`** — NestJS 11. Owns every bit of server behaviour: REST, WebSocket, LLM calls, session state.
- **`.github/`** — `ticket_00N.md` (scope), `backlog-ticket.md` (known gaps, B-1…B-9), `system-architecture.png` and `feature-flow.png` (design references worth reading before structural work).

`api/` is **its own git repo nested inside this one**. Commits to it do not appear in the root repo's status.

## Commands

Both servers must be running for anything to work end to end.

```bash
cd api && npm run start:dev   # :3001  (watch mode)
cd web && npm run dev         # :3000
```

Per project:

| | api | web |
|---|---|---|
| build | `npm run build` | `npm run build` |
| lint | `npm run lint` (note: `--fix`) | `npm run lint` |
| typecheck | `npx tsc --noEmit -p tsconfig.json` | `npx tsc --noEmit` |

`web` has no typecheck script; run `tsc` directly. Its route-prop types (`PageProps`, `LayoutProps`) are generated during `next build`/`next dev`, so `tsc --noEmit` fails with "Cannot find name 'PageProps'" on a clean `.next/` — build once first.

## Testing

**No test runner is in use.** `api` has the Nest jest scaffold (`npm test`, `test:e2e`) but zero test files; `web` has nothing. Ask before adding a runner.

Verification is done by driving the real servers against stand-in AI services. Both external providers are redirectable by environment variable, so no production code changes are needed:

```bash
GOOGLE_GEMINI_BASE_URL=http://localhost:4010          # read by @google/genai (LLM + TTS)
OPENROUTER_TRANSCRIPTION_URL=http://localhost:4011/…  # read by config/constants.ts (STT)
```

A mock must serve SSE for TTS (`:streamGenerateContent`) and plain JSON for the LLM calls, and must return **5–8** questions or `questionBankSchema` rejects the response.

## Architecture

The flow has two phases with different transports.

**Phase 1 — session setup (REST).** Browser POSTs the resume to `POST /session`. The API parses it (pdf-parse / mammoth), makes two Gemini calls — profile extraction, then question generation — and stores a `SessionState` keyed by a generated `sessionId`. Responds `{ sessionId, profile, questionBank }`.

**Phase 2 — interview loop (WebSocket at `/ws/interview`).** The browser opens a socket and sends `session:start`. From there the server drives:

- TTS for the whole question bank is generated **sequentially in the background** so early questions are ready first. This happens while `introduction.wav` (16.7s) plays, so the candidate never waits for it.
- Question audio is **pushed ahead of use**. Two go out immediately; after that a per-connection `unlocked` ceiling opens by one on each `audio:ack` + 3.5s delay, and again on each answer received. `sentCount` doubles as the next index — questions always go out in bank order.
- On `audio:answer` the server claims the slot synchronously (so duplicates fail fast), releases the next question **immediately**, and transcribes in the background. The candidate never waits on an ASR round trip.
- Because transcriptions finish out of order, `SessionStore.upsertTurn` inserts each turn at its question-bank position rather than appending. Appending would scramble the transcript.
- After the last answer the gateway awaits outstanding transcriptions, then sends `session:end`.

`introduction.wav`, `begin.wav`, `conclusion.wav` are static files served from `web/public/generic-wav/` and never travel over the socket. Only generated question audio does.

### Conventions that span files

- **Every HTTP response uses the `ApiResponse` envelope** — `{ success, message, data }`. Build them with `ok()` / `fail()` from `common/api-response.ts`.
- **Throw `SessionError(message, status, code)`** from anywhere in a service. `ApiExceptionFilter` renders it into the envelope with the right status; anything else becomes a 500. The filter logs `cause`, so always pass `{ cause }` when wrapping a lower-level error.
- **Stores are `@Injectable()` singletons** (`SessionStore`, `AudioQueueStore`) holding plain `Map`s. State dies on restart and is not shared across instances — backlog B-6.
- **Contract types are duplicated**, not shared: `api/src/modules/interview/types/` and `web/features/shared/types/`. The API owns the Zod schemas; the web copies are plain types. Change one, change the other.

## Gotchas

- **`MOCK_SESSION=true` skips the resume parser and both Gemini setup calls entirely.** It returns early with a canned question bank, so any code path in setup is untested while it's on. Turn it off when touching parsing or the LLM orchestrator.
- **`pdf-parse` is held at v1 (`^1.1.1`) deliberately.** v2 needs `process.getBuiltinModule` (Node ≥22.3; this machine runs 22.2) and fails to polyfill `DOMMatrix`. The caret keeps it inside v1; don't widen it without checking the Node version.
- **`esModuleInterop: true` must stay on in `api/tsconfig.json`.** `pdf-parse` and `mammoth` are CommonJS with no `__esModule`; the Nest scaffold ships only `allowSyntheticDefaultImports`, which silences the type error but not the runtime failure (`… .default is not a function`).
- **The socket protocol is flat `{ type, ... }`, not Nest's `{ event, data }`.** The gateway attaches a raw `message` listener in `handleConnection` instead of using `@SubscribeMessage`, because most traffic is server-pushed. Nest's router ignores what it can't match.
- **Prettier is deliberately not wired into ESLint** in `api` — the scaffold's `eslint-plugin-prettier` was removed so formatting doesn't surface as lint errors. `npm run format` still exists.
- **Next 16 differs from older App Router conventions.** Read `web/node_modules/next/dist/docs/` before writing route, layout, or metadata code. `searchParams` is a Promise.
- **`web/AGENTS.md` is regenerated by `next dev`.** Don't delete it; commit it if it reappears dirty.

## Environment

`api/.env` (all required, validated by Zod at import — the process throws on startup if any is missing):

```
GEMINI_API_KEY  GEMINI_LLM_MODEL  GEMINI_TTS_MODEL  OPENROUTER_API_KEY
PORT=3001  CORS_ORIGINS=http://localhost:3000
```

`web` needs nothing to run locally — `API_URL` defaults to `http://localhost:3001`. Override with `NEXT_PUBLIC_API_URL`; `WS_URL` is derived from it.
