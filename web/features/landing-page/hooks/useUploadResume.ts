import { useMutation } from "@tanstack/react-query";
import axios, { AxiosError } from "axios";
import { API_URL } from "@/config/constants";
import { toastr } from "@/features/shared/lib/toastr";
import { toMessage, type ApiResponse } from "@/features/shared/types/api-response";
import type { CreateSessionResponse } from "@/features/shared/types/interview";

const uploadResume = async (file: File): Promise<CreateSessionResponse> => {
  const formData = new FormData();
  formData.append("resume", file);

  const { data } = await axios.post<ApiResponse<CreateSessionResponse>>(
    `${API_URL}/session`,
    formData,
    {
      headers: {
        "Content-Type": "multipart/form-data",
      },
    }
  );

  if (!data.data?.sessionId) {
    throw new Error(toMessage(data.message));
  }

  return data.data;
};

export const useUploadResume = (options: {
  onSuccess: (session: CreateSessionResponse) => void;
  onError: (message: string) => void;
}) => {
  return useMutation<CreateSessionResponse, AxiosError<ApiResponse>, File>({
    mutationFn: uploadResume,
    onSuccess: (session) => {
      options.onSuccess(session);
    },
    onError: (error) => {
      const message = toMessage(error.response?.data.message);
      toastr.error(message);
      console.error("Error uploading resume:", error);
      options.onError(message);
    },
  });
};
