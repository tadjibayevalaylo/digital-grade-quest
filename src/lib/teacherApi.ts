export const API_URL: string =
  (import.meta.env.VITE_API_URL as string | undefined) || "http://127.0.0.1:8000";

const TOKEN_KEY = "teacher_api_token";

export function getApiToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setApiToken(token: string) {
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearApiToken() {
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}

async function parseError(res: Response): Promise<never> {
  let msg = `Xatolik (${res.status})`;
  try {
    const data = await res.json();
    if (typeof data?.detail === "string") msg = data.detail;
    else if (Array.isArray(data?.detail) && data.detail[0]?.msg) msg = data.detail[0].msg;
  } catch {
    /* ignore */
  }
  throw new ApiError(msg, res.status);
}

export async function apiLogin(email: string, password: string): Promise<string> {
  const body = new URLSearchParams({ username: email, password });
  const res = await fetch(`${API_URL}/api/teacher/login`, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) await parseError(res);
  const data = await res.json();
  setApiToken(data.access_token);
  return data.access_token as string;
}

async function request<T>(path: string, init: RequestInit = {}, auth = true): Promise<T> {
  const headers: Record<string, string> = { ...(init.headers as Record<string, string>) };
  if (init.body) headers["Content-Type"] = "application/json";
  if (auth) {
    const token = getApiToken();
    if (!token) throw new ApiError("Tizimga kiring (token yo'q).", 401);
    headers["Authorization"] = `Bearer ${token}`;
  }
  const res = await fetch(`${API_URL}${path}`, { ...init, headers });
  if (res.status === 401) {
    clearApiToken();
    throw new ApiError("Sessiya tugadi, qaytadan kiring.", 401);
  }
  if (!res.ok) await parseError(res);
  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/* ---------- Types ---------- */

export type ApiTopic = {
  id: number | string;
  nomi: string;
  tavsif?: string | null;
  tartib?: number | null;
};

export type QuestionType = "multiple_choice" | "fill_blank" | "true_false";

export type ApiChoice = { id?: number | string; matn: string; togri: boolean };

export type ApiQuestion = {
  id: number | string;
  topic_id: number | string;
  matn: string;
  turi: QuestionType;
  daraja: string;
  togri_javob_matni?: string | null;
  choices?: ApiChoice[] | null;
};

export type QuestionPayload = {
  topic_id: number | string;
  matn: string;
  turi: QuestionType;
  daraja: string;
  togri_javob_matni?: string;
  choices?: { matn: string; togri: boolean }[];
};

/* ---------- Topics ---------- */

export const listTopics = () => request<ApiTopic[]>("/api/topics", {}, false);

export const createTopic = (data: { nomi: string; tavsif?: string }) =>
  request<ApiTopic>("/api/teacher/topics", { method: "POST", body: JSON.stringify(data) });

export const updateTopic = (
  id: number | string,
  data: { nomi?: string; tavsif?: string; tartib?: number },
) => request<ApiTopic>(`/api/teacher/topics/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteTopic = (id: number | string) =>
  request<void>(`/api/teacher/topics/${id}`, { method: "DELETE" });

/* ---------- Questions ---------- */

export const listQuestions = (topicId: number | string) =>
  request<ApiQuestion[]>(`/api/teacher/topics/${topicId}/questions`);

export const createQuestion = (data: QuestionPayload) =>
  request<ApiQuestion>("/api/teacher/questions", { method: "POST", body: JSON.stringify(data) });

export const updateQuestion = (id: number | string, data: QuestionPayload) =>
  request<ApiQuestion>(`/api/teacher/questions/${id}`, { method: "PUT", body: JSON.stringify(data) });

export const deleteQuestion = (id: number | string) =>
  request<void>(`/api/teacher/questions/${id}`, { method: "DELETE" });

export const TYPE_LABELS: Record<QuestionType, string> = {
  multiple_choice: "Bitta tanlov",
  fill_blank: "Bo'sh joy to'ldirish",
  true_false: "To'g'ri-Noto'g'ri",
};

export const DARAJA_OPTIONS = ["oson", "o'rta", "qiyin"];
