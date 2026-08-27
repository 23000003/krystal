export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string | string[];
  data?: T;
};

export type ApiErrorData = {
  code: string;
};

export function ok<T>(data: T, message: string): ApiResponse<T> {
  return { success: true, message, data };
}

export function fail(
  message: string,
  code: string,
): ApiResponse<ApiErrorData> {
  return { success: false, message, data: { code } };
}
