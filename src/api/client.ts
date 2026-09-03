export const API_URL = import.meta.env.VITE_API_URL ?? "http://localhost:4000";

export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, {
    credentials: "include",
    headers: init?.body ? { "Content-Type": "application/json" } : undefined,
    ...init,
  });
  let data: { ok?: boolean; error?: string } & T;
  try {
    data = (await res.json()) as never;
  } catch {
    throw new ApiError(res.status, "unexpected response");
  }
  if (!res.ok || data.ok === false) {
    throw new ApiError(res.status, data.error ?? `request failed (${res.status})`);
  }
  return data;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body?: unknown) =>
    request<T>(path, { method: "POST", body: body === undefined ? undefined : JSON.stringify(body) }),
  patch: <T>(path: string, body: unknown) => request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};

/** Multipart upload (images, CVs) — browser sets the content-type boundary itself. */
export async function apiUpload<T>(path: string, form: FormData): Promise<T> {
  const res = await fetch(`${API_URL}/api/v1${path}`, { method: "POST", credentials: "include", body: form });
  const data = (await res.json().catch(() => null)) as ({ ok?: boolean; error?: string } & T) | null;
  if (!res.ok || !data || data.ok === false) {
    throw new ApiError(res.status, data?.error ?? `upload failed (${res.status})`);
  }
  return data;
}
