import { useMutation } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { queryClient } from "@/lib/queryClient";

interface LoginRequest {
  email: string;
  password: string;
}

interface RegisterRequest {
  email: string;
  password: string;
}

interface TokenResponse {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export function useLogin() {
  return useMutation({
    mutationFn: async (data: LoginRequest): Promise<TokenResponse> => {
      const response = await api.post("/auth/login", data);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
    },
  });
}

export function useRegister() {
  return useMutation({
    mutationFn: async (data: RegisterRequest): Promise<TokenResponse> => {
      const response = await api.post("/auth/register", data);
      return response.data;
    },
    onSuccess: (data) => {
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("refresh_token", data.refresh_token);
    },
  });
}

export function useLogout() {
  return useMutation({
    mutationFn: async () => {
      // BUG-09 FIX: Send refresh_token to backend so it can be blacklisted
      const refreshToken = localStorage.getItem("refresh_token");
      await api.post("/auth/logout", { refresh_token: refreshToken ?? "" });
    },
    onSuccess: () => {
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      // BUG-15 FIX: Clear all React Query cache on logout so cached todos/user
      // data is not visible to the next user on the same browser session.
      queryClient.clear();
    },
    onError: () => {
      // Even on error, clear local state
      localStorage.removeItem("access_token");
      localStorage.removeItem("refresh_token");
      queryClient.clear();
    },
  });
}

interface UserResponse {
  id: string;
  email: string;
  created_at: string;
}

export async function fetchCurrentUser(): Promise<UserResponse> {
  const response = await api.get("/auth/me");
  return response.data;
}
