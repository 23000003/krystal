import { useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { API_URL } from "@/config/constants";
import {
  toMessage,
  type ApiErrorData,
  type ApiResponse,
} from "@/features/shared/types/api-response";
import { useSessionHistory } from "@/features/shared/stores/session-history.store";
import type { InterviewReport } from "@/features/shared/types/interview";

const FALLBACK_MESSAGE = "We couldn't load your results.";

/** Scoring runs in the background, so the first few requests may be early. */
const PENDING_CODE = "report_pending";
const MAX_PENDING_RETRIES = 20;

class ReportPendingError extends Error {
  readonly pending = true;
}

const fetchReport = async (sessionId: string): Promise<InterviewReport> => {
  try {
    const { data } = await axios.get<ApiResponse<InterviewReport>>(
      `${API_URL}/session/${sessionId}/result`,
    );

    if (!data.data) throw new Error(toMessage(data.message));

    return data.data;
  } catch (error) {
    const response = (error as AxiosError<ApiResponse<ApiErrorData>>).response;
    const body = response?.data;

    // Not an error the user should see.
    if (body?.data?.code === PENDING_CODE) {
      throw new ReportPendingError(toMessage(body.message));
    }

    throw new Error(
      body ? toMessage(body.message) : FALLBACK_MESSAGE,
    );
  }
};

export function useInterviewResult(sessionId: string) {
  const remember = useSessionHistory((state) => state.remember);

  const query = useQuery<InterviewReport>({
    queryKey: ["interview-result", sessionId],
    enabled: Boolean(sessionId) && sessionId !== "placeholder",
    queryFn: () => fetchReport(sessionId),
    // Keep polling while the report is still pending.
    retry: (failureCount, error) => error instanceof ReportPendingError && failureCount < MAX_PENDING_RETRIES,
    retryDelay: 1_500,
  });

  // Only a finished report is worth remembering — a pending or failed one has
  // nothing to navigate back to. `remember` is idempotent, so re-renders and
  // revisits are harmless.
  const report = query.data;
  useEffect(() => {
    if (!report) return;
    remember({
      sessionId,
      candidateName: report.candidate.name,
      role: report.candidate.role,
      completedAt: new Date().toISOString(),
    });
  }, [report, remember, sessionId]);

  return query;
}
