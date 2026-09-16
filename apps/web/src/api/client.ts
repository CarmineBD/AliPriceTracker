const apiBaseUrl = import.meta.env.VITE_API_URL ?? 'http://localhost:3000';

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly code?: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

export async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`${apiBaseUrl}${path}`, options);

  if (!response.ok) {
    const body: unknown = await response.json().catch(() => undefined);
    const message =
      typeof body === 'object' && body !== null && 'message' in body && typeof body.message === 'string'
        ? body.message
        : typeof body === 'object' && body !== null && 'error' in body && typeof body.error === 'string'
          ? body.error
        : `Request failed with status ${response.status}`;
    const code =
      typeof body === 'object' && body !== null && 'code' in body && typeof body.code === 'string'
        ? body.code
        : undefined;
    const details = typeof body === 'object' && body !== null ? (body as Record<string, unknown>) : undefined;

    throw new ApiError(message, response.status, code, details);
  }

  if (response.status === 204) {
    return undefined as T;
  }

  return (await response.json()) as T;
}
