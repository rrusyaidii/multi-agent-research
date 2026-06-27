export type AgentStep = "supervisor" | "search" | "analysis" | "writer" | "finish";
export type AgentStatus = "idle" | "active" | "done" | "error";
export type JobStatus = "running" | "completed" | "failed" | "not_found";

export interface PipelineStep {
  agent: AgentStep;
  status: AgentStatus;
  label: string;
}

export interface ResearchStartResponse {
  thread_id: string;
  status: "running";
  topic: string;
}

export interface ResearchStatusResponse {
  thread_id: string;
  topic: string;
  status: JobStatus;
  steps: PipelineStep[];
  report: string | null;
  analysis: string | null;
  error: string | null;
}

export interface HealthResponse {
  status: "ok";
}

export interface ApiError {
  detail: string;
}
