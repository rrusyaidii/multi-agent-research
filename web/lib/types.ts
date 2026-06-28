export type AgentStep = "supervisor" | "search" | "analysis" | "writer" | "finish";
export type AgentStatus = "idle" | "active" | "done" | "error";
export type JobStatus = "running" | "completed" | "failed" | "cancelled" | "not_found";

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
  step_count: number;
  max_steps: number;
  session_cost: number | null;
  max_cost: number | null;
  budget_exceeded: boolean;
}

export interface HealthResponse {
  status: "ok";
}

export interface ResearchHistoryItem {
  thread_id: string;
  topic: string;
  status: Exclude<JobStatus, "not_found">;
  created_at: string;
  updated_at: string;
  has_report: boolean;
  error: string | null;
}

export interface ResearchHistoryResponse {
  items: ResearchHistoryItem[];
}

export interface ApiError {
  detail: string;
}
