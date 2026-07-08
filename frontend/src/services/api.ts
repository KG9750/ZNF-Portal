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
