BACKLOG: AI Interviewer — Deferred Items

Known gaps carried over from TICKET-003. None of these block the interview loop,
which works end to end today. Each entry is independent — pick them off in any order.

---

## B-1. Stop converting answers to WAV (upload size)

**Priority:** High — likely the biggest remaining latency win.

**Problem**
`MediaRecorder` produces webm/opus, but `features/shared/lib/wav.ts` decodes and
re-encodes every answer to 16 kHz mono WAV before upload, because
`stt-code-reference.ts` used `format: "wav"`. A 60-second answer is roughly:

- webm/opus:  ~200 KB
- WAV:        ~1.9 MB
- WAV + base64 in a JSON socket frame: **~2.6 MB**

That is ~13x more bytes on the wire than needed, and the upload happens before
qwen3-asr even starts work.

**Tasks**
- [ ] Confirm whether OpenRouter accepts `format: "webm"` / `"opus"` for
      `qwen/qwen3-asr-1.7b`. This is the deciding question — everything else
      depends on the answer.
- [ ] If yes: send the recorder output directly and delete the conversion step
      in `blobToWavBase64`. Keep `base64WavToUrl` — TTS playback still needs it.
- [ ] Either way, switch `audio:answer` to a **binary WebSocket frame** instead
      of base64 inside JSON. That alone removes the 33% base64 inflation.
      Needs a small envelope (question id) ahead of the binary payload.

**Acceptance**
- [ ] A 60-second answer uploads in well under 500 KB.
- [ ] Transcript text quality is unchanged versus the WAV path.

---

## B-2. Failed transcriptions leave a hole in the transcript

**Priority:** High — TICKET-004 will hit this.

**Problem**
Transcription now runs in the background. If one call fails, the candidate gets a
toast and the interview correctly continues, but that question never gets a
`conversationHistory` entry. The transcript silently ends up with 6 of 7 answers,
and result generation has no way to tell "not answered" from "failed to transcribe".

**Tasks**
- [ ] Retry a failed transcription (2 attempts, backoff) before giving up.
- [ ] On final failure, still write the turn with an explicit marker — e.g.
      `answer: ""` plus `status: "failed"` on `ConversationTurn` — so the gap is
      visible rather than invisible.
- [ ] Have TICKET-004 skip or flag failed turns instead of scoring them as empty.

**Acceptance**
- [ ] With the transcriber forced to fail once, the session still completes and
      `conversationHistory` has an entry for every question.

---

## B-3. Answer audio is discarded

**Priority:** Medium. Prerequisite for a clean B-2 retry.

**Problem**
Recorded audio is transcribed and dropped. Nothing can be re-transcribed after
the fact, which makes B-2 retries best-effort and makes debugging a bad
transcript impossible.

**Tasks**
- [ ] Persist each answer blob keyed by `sessionId` + `questionId`.
- [ ] Decide retention (delete on session end? keep for the results screen?).
- [ ] Note: this is for retry and debugging only — it is **not** a latency fix.
      Batching all transcription to the end of the interview was considered and
      rejected: it moves the wait to the results screen, makes one failure lose
      the whole interview, and holds ~10–20 MB per session in memory.

---

## B-4. Browser half of the interview loop is unverified

**Priority:** High — this is a testing gap, not a known defect.

**Problem**
The socket protocol is verified end to end against mock TTS and STT. Everything
that needs a real browser is not: microphone capture, `MediaRecorder`, the WAV
re-encode, audio playback, and the "Ready" keyword. There is no test runner in
this repo (see CLAUDE.md).

**Tasks**
- [ ] Manual pass: full interview in Chrome with real keys, start to results.
- [ ] Same pass in Safari and Firefox, where `SpeechRecognition` is missing and
      the "I'm Ready" button is the only path forward.
- [ ] Confirm `introduction.wav` autoplays; if the browser blocks it, confirm the
      "Tap to enable audio" fallback appears and works.
- [ ] Decide whether to add Playwright. Would need a runner added first — ask
      before introducing one.

---

## B-5. Keyword detection is Chrome/Edge only

**Priority:** Low — the button fallback covers it.

**Problem**
"Ready" detection uses the Web Speech API (`webkitSpeechRecognition`), which
Safari and Firefox do not usefully support. Those users must click "I'm Ready".

**Tasks**
- [ ] Decide whether that is acceptable. If not, the alternative is streaming
      short audio chunks to the transcriber and keyword-matching server side —
      one ASR request every few seconds while idle, which costs real money.

---

## B-6. Sessions live in memory only

**Priority:** Medium — depends on when this stops being a PoC.

**Problem**
`SessionStore` and `AudioQueueStore` are `Map`s cached on `globalThis`. Sessions
die on server restart, and nothing works across more than one instance.

**Tasks**
- [ ] Pick a store. Postgres with a `jsonb` column is the recommendation:
      real columns for what gets queried (`session_id`, `status`, `created_at`,
      `overall_score`), JSON for the LLM-shaped parts that keep changing.
- [ ] Swap surface is small — `SessionStore` has five methods and two consumers.
      `get` becomes async.

---

## B-7. Static audio and prompts are hardcoded

**Priority:** Low.

- [ ] `MOCK_QUESTION_BANK` in `infrastructure/server/mock/mock-question-bank.ts`
      is transcribed by hand from `public/questions.txt`. Editing the .txt does
      nothing. Either parse the file or accept the constant as the source.
- [ ] TTS generation is sequential across the whole bank. It comfortably fits
      inside the 16.7s intro + 4.2s begin today. If real Gemini TTS turns out
      slower, generate the first 2 sequentially then fire the rest in parallel.

---

## B-8. `/api/logs` route was deleted

**Priority:** Low.

`features/shared/lib/logger.ts` still POSTs browser logs to `/api/logs`, which no
longer exists. The fetch is fire-and-forget so nothing breaks, but every client
log line is a silent 404.

- [ ] Either restore the route handler or drop the client-side shipping.

---

## B-9. `/api/session` is unauthenticated

**Priority:** Medium before any public deploy.

Anyone can POST a resume and burn Gemini quota, and `GET /api/session?id=` returns
full session state to anyone holding a session id.

- [ ] Rate limit by IP at minimum.
- [ ] Revisit once accounts exist.
