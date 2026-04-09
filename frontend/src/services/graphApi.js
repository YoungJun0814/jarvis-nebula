const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? '';

export class GraphApiError extends Error {
  constructor(message, { status = 500, detail = null } = {}) {
    super(message);
    this.name = 'GraphApiError';
    this.status = status;
    this.detail = detail;
  }
}

export async function fetchGraphSnapshot() {
  return requestJson('/api/graph/snapshot');
}

export async function queryGraph(payload) {
  return requestJson('/api/graph/query', {
    method: 'POST',
    body: JSON.stringify(payload),
  });
}

async function requestJson(path, init = {}) {
  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers ?? {}),
    },
  });

  const isJson = response.headers.get('content-type')?.includes('application/json');
  const payload = isJson ? await response.json() : null;

  if (!response.ok) {
    throw new GraphApiError(payload?.detail ?? 'Request failed.', {
      status: response.status,
      detail: payload?.detail ?? null,
    });
  }

  return payload;
}
