TICKET-003: AI Interviewer — Interview Loop / Session Functionality

**Objective**
Implement the live interview session flow. This covers audio playback, speech-to-text transcription, question queuing, WebSocket communication, and transcript management.

---

**Mock data**
Use ../public/questions.txt as the mock data first (create a flag if true then use mock data (skips the entire session setup and use the logged data))

---
**Flow**

Session starts
  → Play introduction.wav
  → Listen for keyword "Ready"
  → Play begin.wav
  → Play first question audio
  → Candidate answers → clicks Done button
  → Audio sent to Transcriber Model → saved to transcript
  → Play next question audio
  → Repeat until all questions answered
  → Play conclusion.wav
  → Navigate to /interview-session?id=[id]&result=true

---

**Implementation Details**

1. Introduction Sequence
   - On session start, play /public/generic-wav/generiv-wav/introduction.wav automatically.
   - After introduction.wav finishes, activate the microphone and listen for the keyword "Ready".
   - On keyword detected, play /public/generic-wav/generiv-wav/begin.wav.
   - After begin.wav finishes, begin the question playback flow.

2. Question Audio Queue (Server-side)
   - On session initiation, take the generated question bank from TICKET-002.
   - Convert each question to a TTS audio file using Gemini TTS.
   - Store all generated audio files in a queue object keyed by question id:
     {
       queue: [
         { questionId: "q1", audio: <base64>, status: "pending", sessionId: "<id>" },
         { questionId: "q2", audio: <base64>, status: "pending", sessionId "<id>" },
         ...
       ]
     }
   - On session start, immediately send the first 2 audio files to the client via WebSocket.
   - After a delay (e.g. 3–5 seconds after client acknowledges receipt), send the next batch.
   - Continue until the queue is exhausted.

3. WebSocket Communication
   - Use WebSocket (WSS) for all real-time audio session communication.
   - Message types to handle:
     • session:start → server plays introduction.wav and begins queue processing.
     • audio:question → server sends next question audio chunk(s) to client.
     • audio:answer → client sends recorded answer audio to server.
     • transcript:save → server confirms answer has been transcribed and saved.
     • session:end → server plays conclusion.wav and signals navigation.

4. Candidate Answer Flow
   - Display a "Done Answering" button on the interview UI.
   - On button click, stop recording and send the audio blob to the server via WebSocket (audio:answer).
   - Server sends audio to the Transcriber Model (qwen3-asr-1.7b).
   - Transcribed text is saved to the session transcript with its associated question:
     {
       questionId: "q1",
       question: "Walk me through a React project you're most proud of.",
       answer: "I built a dashboard using React and TypeScript..."
     }
   - After transcript is saved, server sends the next question audio to the client.

5. Transcript Management
   - Every answer must be stored alongside its respective question in the session state.
   - Append to conversationHistory in the session state object:
     conversationHistory: [
       { questionId, question, answer, timestamp },
       ...
     ]

6. Session Conclusion
   - When all questions have been answered and transcript saved:
     • Server sends conclusion.wav to the client.
     • After playback, client navigates to /interview-session?id=[id]&result=true.

---

**Static Audio Files (Pre-generated, stored in /public/generic-wav)**
- introduction.wav — played on session start.
- begin.wav — played after candidate says "Ready".
- conclusion.wav — played after all questions are answered.

---

**Acceptance Criteria**
- [ ] introduction.wav plays automatically on session start.
- [ ] Keyword "Ready" detection triggers begin.wav playback.
- [ ] All questions are converted to TTS audio and stored in a queue on session initiation.
- [ ] First 2 question audios are sent to the client immediately, subsequent ones are sent with a delay.
- [ ] "Done Answering" button stops recording and sends audio to the server.
- [ ] Each answer is transcribed and saved with its respective question in the session transcript.
- [ ] WebSocket handles all audio communication with the correct message types.
- [ ] conclusion.wav plays after all questions are answered.
- [ ] Client navigates to /interview-session?id=[id]&result=true after conclusion.

---

**Notes**
- TTS Model: Gemini Flash.
- Transcriber Model: qwen3-asr-1.7b via OpenRouter.
- No follow-up questions in this ticket — straight sequential question flow only.
- Static audio files (introduction.wav, begin.wav, conclusion.wav) are pre-generated and stored in /public — do not generate them at runtime.
- Keep complexity low: no dynamic follow-ups, no timer per question, just the Done button to signal answer completion.
- No result summary generation yet.
- Check out /stt-code-reference.ts and /tts-code-reference.ts for the code reference on how to implement the Gemini TTS and OpenRouter Qwen Transcriber (STT).