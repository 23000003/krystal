TICKET-004: AI Interviewer — Session End / Results UI & Functionality

**Objective**
Implement the session end flow — trigger the evaluation after the interview concludes, generate a structured results report via the LLM, and display it on the results page.

---

**Flow**

All questions answered
  → Play conclusion.wav
  → Navigate to /interview-session?id=[id]&result=true
  → Page loads → fetch session results via sessionId
  → Display structured evaluation report

---

**Implementation Details**

1. Result Generator (LLM Call)
   - Triggered server-side after all answers are transcribed and saved.
   - Send to the LLM:
     • Full conversation transcript (question + answer pairs)
     • Candidate profile (name, role, skills, experience)
   - LLM generates a structured evaluation report as JSON:
     {
       candidate: { name, role },
       overallRecommendation: "For Next Round" | "Not Recommended" | "Strong Hire",
       technicalCompetencies: [
         {
           competency: string,
           evidence: string,
           bar: string,
           status: "Strong" | "Adequate" | "Gap" | "Gap — [HIGH]"
         }
       ],
       behavioralCompetencies: [
         {
           competency: string,
           evidence: string,
           status: "Strong" | "Adequate" | "Gap" | "Gap — [HIGH]"
         }
       ]
     }
   - Store the report in session state under the sessionId.

2. Results API Endpoint
   - Create GET /api/session/:id/result
   - Returns the evaluation report JSON from session state.
   - Called by the frontend on page load of the results page.

3. Results Page UI (/interview-session?id=[id]&result=true)

   Header Section:
   - Candidate name and role.
   - Overall Recommendation badge (e.g. "Strong Hire", "Gap — HIGH", etc.).

   Technical Competencies Table:
   - Columns: Competency | Evidence | Bar | Status
   - Each row represents one technical competency from the report.
   - Status column is color coded:
     • Strong → Green
     • Adequate → Yellow
     • Gap → Orange
     • Gap — [HIGH] → Red

   Behavioral Competencies Table:
   - Columns: Competency | Evidence | Status
   - Same color coding as above.

   **Example Table layout**
    Technical Competencies Table
      Columns: Competency | Evidence | Bar | Status
      Example row: React / Next.js | Server vs client component distinction ok | Component delivery with correct data-fetching patterns | Adequate

    Behavioral Competencies Table
      Columns: Competency | Evidence | Status
      Example row: Ownership | Drove fixes from investigation to proposal | Strong

4. Loading State
   - Show a loading indicator while fetching results from GET /api/session/:id/result.
   - Display an error state if the fetch fails or sessionId is invalid.

---

**Acceptance Criteria**
- [ ] LLM generates a structured evaluation report from the full transcript after session ends.
- [ ] Report is stored in session state and retrievable via GET /api/session/:id/result and also automatically navigates to result if the session id is already done.
- [ ] Results page loads and fetches the report using the sessionId from the URL.
- [ ] Technical Competencies table renders with all 4 columns (Competency, Evidence, Bar, Status).
- [ ] Behavioral Competencies table renders with all 3 columns (Competency, Evidence, Status).
- [ ] Status column is color coded (Strong = green, Adequate = yellow, Gap = orange, Gap HIGH = red).
- [ ] Overall Recommendation is displayed prominently at the top.
- [ ] Loading and error states are handled.
- [ ] Take out "Start Another Interview" at Ending
- [ ] Indicate Years of Experience 

---

**Notes**
- LLM Model: Gemini Flash.
- No persistence in this ticket — results live in memory tied to the sessionId.
- The number of competencies evaluated depends on the questions generated in TICKET-002 — keep it dynamic, not hardcoded.
- Use the example table structure above as the UI reference.