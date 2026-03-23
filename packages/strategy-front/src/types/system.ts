export type ToolID = "git" | "node" | "npm" | "opencode";

export type ToolStatus = "installed" | "missing" | "installing" | "failed";

export type TaskStatus = "pending" | "running" | "success" | "failed";

export interface ToolState {
  id: ToolID;
  label: string;
  installed: boolean;
  version?: string;
  path?: string;
  status: ToolStatus;
  message?: string;
  task_id?: string;
  updated_at: string;
}

export interface InstallTask {
  id: string;
  tool: ToolID;
  status: TaskStatus;
  started_at: string;
  finished_at?: string;
  exit_code?: number;
  error?: string;
  output?: string;
  log?: string[];
}

export interface OpencodeState {
  enabled: boolean;
  startup: string;
  bin: string;
  url: string;
  cwd?: string;
  status: string;
  ready: boolean;
  running: boolean;
  owned: boolean;
  pid?: number;
  message?: string;
  started_at?: string;
  log?: string[];
}
