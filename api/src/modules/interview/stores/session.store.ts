import { Injectable } from '@nestjs/common';
import type { ISessionStore } from './interface/session-store.interface';
import type {
  ConversationTurn,
  InterviewReport,
  SessionState,
} from '../types/interview.types';

/**
 * In-memory session store, kept alive by Nest's DI singleton. Sessions do not
 * survive a restart and are not shared across instances — see backlog B-6.
 */
@Injectable()
export class SessionStore implements ISessionStore {
  private readonly sessions = new Map<string, SessionState>();

  save(session: SessionState): SessionState {
    this.sessions.set(session.sessionId, session);
    return session;
  }

  get(sessionId: string): SessionState | undefined {
    return this.sessions.get(sessionId);
  }

  count(): number {
    return this.sessions.size;
  }

  setReport(sessionId: string, report: InterviewReport): void {
    const session = this.sessions.get(sessionId);
    if (session) session.report = report;
  }

  update(sessionId: string, patch: Partial<Omit<SessionState, 'sessionId'>> ): SessionState | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;
    Object.assign(session, patch);
    return session;
  }

  upsertTurn(sessionId: string,turn: ConversationTurn): SessionState | undefined {
    const session = this.sessions.get(sessionId);
    if (!session) return undefined;

    const orderOf = (questionId: string) =>
      session.questionBank.findIndex((question) => question.id === questionId);
    const order = orderOf(turn.questionId);

    const existing = session.conversationHistory.findIndex(
      (entry) => entry.questionId === turn.questionId,
    );
    if (existing >= 0) {
      session.conversationHistory[existing] = turn;
      return session;
    }

    const insertAt = session.conversationHistory.findIndex(
      (entry) => orderOf(entry.questionId) > order,
    );
    if (insertAt === -1) {
      session.conversationHistory.push(turn);
    } else {
      session.conversationHistory.splice(insertAt, 0, turn);
    }

    session.currentQuestionIndex = session.conversationHistory.length;
    return session;
  }
}
