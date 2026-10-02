let inMemoryAccessToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;

export const setAccessToken = (token: string | null) => {
  inMemoryAccessToken = token;
};

export const getAccessToken = (): string | null => {
  return inMemoryAccessToken;
};

export const getApiBaseUrl = (): string => {
  return process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';
};

interface RequestOptions extends RequestInit {
  skipAuth?: boolean;
}

export async function apiFetch<T = any>(
  endpoint: string,
  options: RequestOptions = {},
): Promise<T> {
  const baseUrl = getApiBaseUrl();
  const url = endpoint.startsWith('http') ? endpoint : `${baseUrl}${endpoint}`;

  const headers = new Headers(options.headers || {});
  headers.set('X-Requested-With', 'XMLHttpRequest');

  if (!headers.has('Content-Type') && options.body && typeof options.body === 'string') {
    headers.set('Content-Type', 'application/json');
  }

  if (!options.skipAuth && inMemoryAccessToken) {
    headers.set('Authorization', `Bearer ${inMemoryAccessToken}`);
  }

  const fetchOptions: RequestInit = {
    ...options,
    headers,
    credentials: 'include',
  };

  let response: Response;
  try {
    response = await fetch(url, fetchOptions);
  } catch (err) {
    throw new Error('Falha de rede ao conectar com o servidor.');
  }

  // Se receber 401 e não for rota de login/refresh, tenta renovar silenciosamente
  if (
    response.status === 401 &&
    !options.skipAuth &&
    !endpoint.includes('/api/auth/login') &&
    !endpoint.includes('/api/auth/refresh')
  ) {
    if (!refreshPromise) {
      refreshPromise = (async () => {
        try {
          const refreshRes = await fetch(`${baseUrl}/api/auth/refresh`, {
            method: 'POST',
            credentials: 'include',
            headers: {
              'X-Requested-With': 'XMLHttpRequest',
            },
          });

          if (!refreshRes.ok) {
            setAccessToken(null);
            return null;
          }

          const data = await refreshRes.json();
          setAccessToken(data.accessToken);
          return data.accessToken as string;
        } catch {
          setAccessToken(null);
          return null;
        } finally {
          refreshPromise = null;
        }
      })();
    }

    const newToken = await refreshPromise;
    if (newToken) {
      // Repete a requisição original com o novo token
      headers.set('Authorization', `Bearer ${newToken}`);
      const retryResponse = await fetch(url, {
        ...fetchOptions,
        headers,
      });

      if (!retryResponse.ok) {
        const errorData = await retryResponse.json().catch(() => null);
        throw new ApiError(
          errorData?.message || retryResponse.statusText,
          retryResponse.status,
          errorData,
        );
      }

      return retryResponse.json() as Promise<T>;
    } else {
      setAccessToken(null);
      throw new ApiError('Sessão expirada. Por favor, faça login novamente.', 401);
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new ApiError(
      errorData?.message || response.statusText,
      response.status,
      errorData,
    );
  }

  // Verifica se tem corpo na resposta (ex: 204 No Content)
  if (response.status === 204) {
    return null as T;
  }

  return response.json() as Promise<T>;
}

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number,
    public readonly data?: any,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}
