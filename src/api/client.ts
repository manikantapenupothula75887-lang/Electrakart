/**
 * ElectraKart Production API Client
 * Strongly typed HTTP client with Bearer token authentication,
 * timeout handling, and RFC 7807 Problem Details parsing.
 */

export interface ApiErrorDetails {
  type?: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  errorCode?: string;
}

export class ApiError extends Error {
  public status: number;
  public details: ApiErrorDetails;

  constructor(status: number, details: ApiErrorDetails) {
    super(details.detail || details.title || `HTTP Error ${status}`);
    this.name = 'ApiError';
    this.status = status;
    this.details = details;
  }
}

class ApiClient {
  private baseURL: string;

  constructor(baseURL?: string) {
    this.baseURL = baseURL || (import.meta.env?.VITE_API_BASE_URL as string) || '/api/v1';
  }

  private getToken(): string | null {
    const session = localStorage.getItem('electrakart_auth_session');
    if (session) {
      try {
        const parsed = JSON.parse(session);
        return parsed.token || null;
      } catch {
        return null;
      }
    }
    return localStorage.getItem('electrakart_auth_token');
  }

  private handleUnauthorized(): void {
    localStorage.removeItem('electrakart_auth_token');
    localStorage.removeItem('electrakart_auth_session');
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {},
    timeoutMs = 8000
  ): Promise<T> {
    const url = endpoint.startsWith('http') ? endpoint : `${this.baseURL}${endpoint}`;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...((options.headers as Record<string, string>) || {}),
    };

    const token = this.getToken();
    if (token && !headers['Authorization']) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        ...options,
        headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      // 204 No Content
      if (response.status === 204) {
        return undefined as unknown as T;
      }

      const isJson = response.headers.get('content-type')?.includes('json');
      const data = isJson ? await response.json() : await response.text();

      if (!response.ok) {
        if (response.status === 401) {
          this.handleUnauthorized();
        }

        const errorDetails: ApiErrorDetails = isJson
          ? data
          : {
              title: response.statusText || 'Request Failed',
              status: response.status,
              detail: String(data),
            };

        throw new ApiError(response.status, errorDetails);
      }

      return data as T;
    } catch (err: any) {
      clearTimeout(timeoutId);
      if (err.name === 'AbortError') {
        throw new ApiError(408, {
          title: 'Request Timeout',
          status: 408,
          detail: 'The request took too long to complete. Please verify the backend connection.',
        });
      }
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(500, {
        title: 'Network Error',
        status: 500,
        detail: err.message || 'Failed to communicate with ElectraKart backend.',
      });
    }
  }

  public get<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  public post<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public put<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public patch<T>(endpoint: string, body?: any, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PATCH',
      body: body ? JSON.stringify(body) : undefined,
    });
  }

  public delete<T>(endpoint: string, options?: RequestInit): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }

  public async checkHealth(): Promise<boolean> {
    try {
      const res = await this.get<{ status: string }>('/health', { cache: 'no-store' } as any);
      return res?.status === 'ok';
    } catch {
      return false;
    }
  }
}

export const apiClient = new ApiClient();
