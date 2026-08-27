TICKET: AI Interviewer — UI Shell (No Functionality)

**Objective**
Build the static UI shell for the AI Interviewer application. No backend integration, no API calls — UI and navigation only.

---

**About the app**
AI Interviewer is a voice-based mock interview application that automates the interview process end-to-end.

---

**Pages to Build**

1. `/` — Landing Page
   - Display a "Start a Mock Interview" button.
   - On click, reveal a file upload area (drag & drop + file picker) that accepts PDF/DOCX resume files.
   - On file select, navigate to `/interview-session?id=[placeholder]`.

2. `/interview-session?id=` — Interview Session Page
   - Main interview screen where the interviewee and AI interviewer interact.
   - Static layout only: interviewer area, candidate response area, and controls (e.g. mic button, end interview button).
   - On "End Interview", navigate to `/interview-session?id=[id]&result=true`.

3. `/interview-session?id=&result=` — Results Page
   - Display the interview results UI.
   - Static placeholder content: overall score, dimension breakdown, strengths, areas to improve.

---

**Acceptance Criteria**
- [ ] All 3 pages are navigable in sequence.
- [ ] File upload area is visible and accepts drag & drop (no actual upload logic).
- [ ] No API calls or backend integration.
- [ ] UI is responsive and clean.

---

**Notes**
- Use placeholder/dummy data for the results page.
- Focus on layout and navigation flow only.
- Functionality will be handled in a separate ticket.