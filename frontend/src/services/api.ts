export function getApiBaseUrl(): string {
  const meta = import.meta as ImportMeta & {
    env?: ImportMetaEnv;
  };

  return meta.env?.VITE_API_BASE_URL ?? "";
}

export function createApiUrl(path: string, baseUrl = getApiBaseUrl()): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (baseUrl === "") {
    return normalizedPath;
  }

  return new URL(normalizedPath, baseUrl).toString();
}

export interface ApiRequestOptions {
  apiFetch?: typeof fetch;
  signal?: AbortSignal;
}

interface ApiJsonRequestOptions extends ApiRequestOptions {
  body?: unknown;
  method?: string;
}

export async function requestJson(
  path: string,
  errorPrefix: string,
  options: ApiJsonRequestOptions = {}
): Promise<unknown> {
  const apiFetch = options.apiFetch ?? fetch;
  const response = await apiFetch(createApiUrl(path), {
    body: options.body === undefined ? undefined : JSON.stringify(options.body),
    headers: options.body === undefined ? undefined : { "Content-Type": "application/json" },
    method: options.method ?? "GET",
    signal: options.signal
  });

  if (!response.ok) {
    throw new Error(await createApiRequestError(response, errorPrefix));
  }

  return await response.json() as unknown;
}

export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function createApiRequestError(response: Response, prefix: string): Promise<string> {
  const fallback = `${prefix}: ${response.status}`;

  try {
    const body = await response.json() as unknown;

    if (isRecord(body)) {
      if (typeof body.error === "string") {
        return `${fallback} - ${body.error}`;
      }

      if (typeof body.message === "string") {
        return `${fallback} - ${body.message}`;
      }
    }
  } catch {
    return fallback;
  }

  return fallback;
}
