import type {
  HealthResponse,
  ResearchHistoryResponse,
  ResearchStartResponse,
  ResearchStatusResponse,
} from "@/lib/types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL ?? "/api";

export class ResearchApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
  ) {
    super(message);
    this.name = "ResearchApiError";
  }
}

async function parseJson<T>(response: Response): Promise<T> {
  const text = await response.text();
  if (!text) {
    return {} as T;
  }
  return JSON.parse(text) as T;
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let message = `Request failed (${response.status})`;
    try {
      const body = await parseJson<{ detail?: string | { msg: string }[] }>(response);
      if (typeof body.detail === "string") {
        message = body.detail;
      } else if (Array.isArray(body.detail) && body.detail[0]?.msg) {
        message = body.detail[0].msg;
      }
    } catch {
      // use default message
    }
    throw new ResearchApiError(message, response.status);
  }
  return parseJson<T>(response);
}

export async function checkHealth(): Promise<HealthResponse> {
  const response = await fetch(`${API_BASE}/health`, { cache: "no-store" });
  return handleResponse<HealthResponse>(response);
}

export async function startResearch(
  topic: string,
  threadId?: string,
): Promise<ResearchStartResponse> {
  const response = await fetch(`${API_BASE}/research`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ topic, thread_id: threadId ?? null }),
  });
  return handleResponse<ResearchStartResponse>(response);
}

export async function getResearchStatus(
  threadId: string,
): Promise<ResearchStatusResponse> {
  const response = await fetch(`${API_BASE}/status/${encodeURIComponent(threadId)}`, {
    cache: "no-store",
  });
  return handleResponse<ResearchStatusResponse>(response);
}

export async function getResearchHistory(limit = 20): Promise<ResearchHistoryResponse> {
  const response = await fetch(`${API_BASE}/research?limit=${encodeURIComponent(limit)}`, {
    cache: "no-store",
  });
  return handleResponse<ResearchHistoryResponse>(response);
}

export async function cancelResearch(threadId: string): Promise<ResearchStatusResponse> {
  const response = await fetch(`${API_BASE}/research/${encodeURIComponent(threadId)}/cancel`, {
    method: "POST",
  });
  return handleResponse<ResearchStatusResponse>(response);
}

export async function deleteResearch(threadId: string): Promise<void> {
  const response = await fetch(`${API_BASE}/research/${encodeURIComponent(threadId)}`, {
    method: "DELETE",
  });
  await handleResponse<{ deleted: boolean }>(response);
}

export async function clearResearchHistory(): Promise<{ deleted_count: number }> {
  const response = await fetch(`${API_BASE}/research`, {
    method: "DELETE",
  });
  return handleResponse<{ deleted_count: number }>(response);
}

export function subscribeResearchStatus(
  threadId: string,
  onStatus: (status: ResearchStatusResponse) => void,
  onError: () => void,
): EventSource {
  const source = new EventSource(`${API_BASE}/research/${encodeURIComponent(threadId)}/stream`);

  source.addEventListener("status", (event) => {
    onStatus(JSON.parse((event as MessageEvent).data) as ResearchStatusResponse);
  });
  source.addEventListener("done", (event) => {
    onStatus(JSON.parse((event as MessageEvent).data) as ResearchStatusResponse);
    source.close();
  });
  source.onerror = () => {
    source.close();
    onError();
  };

  return source;
}
