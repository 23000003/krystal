import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Sessions whose report finished, persisted to localstorage.
 */
export type CompletedSession = {
  sessionId: string;
  candidateName: string;
  role: string;
  /** ISO timestamp */
  completedAt: string;
};

const MAX_ENTRIES = 20;

type SessionHistoryState = {
  sessions: CompletedSession[];
  /** False until localStorage has been read, so SSR and the client agree. */
  hasHydrated: boolean;
  setHydrated: () => void;
  remember: (session: CompletedSession) => void;
  forget: (sessionId: string) => void;
  clear: () => void;
};

export const useSessionHistory = create<SessionHistoryState>()(
  persist(
    (set) => ({
      sessions: [],
      hasHydrated: false,

      setHydrated: () => set({ hasHydrated: true }),

      remember: (session) =>
        set((state) =>
          state.sessions.some((s) => s.sessionId === session.sessionId)
            ? state
            : {
                sessions: [session, ...state.sessions].slice(0, MAX_ENTRIES),
              },
        ),

      forget: (sessionId) =>
        set((state) => ({
          sessions: state.sessions.filter((s) => s.sessionId !== sessionId),
        })),

      clear: () => set({ sessions: [] }),
    }),
    {
      name: "krystal.session-history",
      partialize: (state) => ({ sessions: state.sessions }),
      onRehydrateStorage: () => (state) => state?.setHydrated(),
    },
  ),
);
