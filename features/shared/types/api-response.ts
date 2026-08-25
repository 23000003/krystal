export type ApiResponse<T = unknown> = {
  success: boolean;
  message: string | string[];
  data?: T;
};

export type ApiErrorData = {
  code: string;
};

export function toMessage(message: string | string[] | undefined): string {
  if (Array.isArray(message)) 
    return message.join(", ") || "Something went wrong, please try again.";
  
  return message || "Something went wrong, please try again.";
}

export function ok<T>(data: T, message: string, status = 200) {
  return Response.json({ success: true, message, data } satisfies ApiResponse<T>, {
    status,
  });
}

export function fail(message: string, status: number, code: string) {
  return Response.json(
    { success: false, message, data: { code } } satisfies ApiResponse<ApiErrorData>,
    { status },
  );
}