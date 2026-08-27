# TICKET-002: AI Interviewer — Session Setup Functionality

**Objective**
Implement the Session Setup flow triggered when the user uploads a resume on the landing page. This covers resume parsing, profile extraction, question generation, and session state initialization using Gemini as the LLM.

---

**Flow**

User uploads resume (PDF/DOCX)
  → Parse raw text from file
  → Send to Gemini → extract structured candidate profile
  → Send profile to Gemini → generate opening question bank (5–8 questions)
  → Initialize and store session state
  → Redirect to /interview-session?id=[sessionId]

---

**LLM ORCHESTRATOR Architecture**
Check-out this image: .github\system-architecture.png and .github\feature-flow.png

**Implementation Details**

1. Resume Upload & Parsing
   - Accept PDF and DOCX file formats.
   - Extract raw text from the uploaded file.
   - Libraries to use: pdf-parse (PDF), mammoth (DOCX).

2. Resume Analyzer (Gemini Call #1)
   - Send raw resume text to Gemini.
   - Prompt Gemini to return a structured JSON profile with the following fields:
     • name
     • targetRole
     • skills (array)
     • yearsOfExperience
     • education
   - Validate that the response is a proper JSON object before proceeding.

3. Question Generator (Gemini Call #2)
   - Send the structured profile to Gemini.
   - Prompt Gemini to generate 5–8 tailored interview questions based on the candidate's background.
   - Each question should include:
     • id
     • topic (e.g. technical, behavioral)
     • question
     • followUpHints (array of strings)
   - Validate that the response is a proper JSON array before proceeding.

4. Session State Initialization
   - Build a session state object:
     {
       sessionId: uuid,
       candidate: { ...profile },
       questionBank: [ ...questions ],
       currentQuestionIndex: 0,
       conversationHistory: [],
       status: "ready"
     }
   - Store session state in memory (Map or equivalent) keyed by sessionId.

5. API Route
   - Create a POST /api/session endpoint.
   - Accepts multipart/form-data with the resume file.
   - Returns: { sessionId, profile, questionBank }
   - On success, the frontend redirects to /interview-session?id=[sessionId].

6. Environment Variables
   - Check /config/env.server.ts and add GEMINI_API_KEY.
   - Make sure the key is properly validated on server startup and throws a clear error if missing.

---

**Acceptance Criteria**
- [ ] PDF and DOCX resumes are parsed and raw text is extracted correctly.
- [ ] Gemini returns a valid structured profile JSON from the resume text.
- [ ] Gemini returns a valid question bank JSON (5–8 questions) based on the profile.
- [ ] Session state is initialized and retrievable by sessionId.
- [ ] POST /api/session returns { sessionId, profile, questionBank }.
- [ ] GEMINI_API_KEY is wired through /config/env.server.ts.
- [ ] On successful session creation, frontend redirects to /interview-session?id=[sessionId].

---

**Notes**
- No interview loop or audio functionality in this ticket — session setup only.
- Use Gemini 2.0 Flash model.
- If /config/env.server.ts has existing env validation patterns, follow the same pattern when adding GEMINI_API_KEY.
- Handle errors gracefully: invalid file type, failed Gemini response, malformed JSON.