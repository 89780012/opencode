package workflow

type Kind string

const (
	Start   Kind = "start"
	Router  Kind = "router"
	Plan    Kind = "plan"
	Execute Kind = "execute"
	Check   Kind = "check"
	End     Kind = "end"
)

type Cond string

const (
	Always    Cond = "always"
	PlanTo    Cond = "plan"
	ExecuteTo Cond = "execute"
	CheckTo   Cond = "check"
	Pass      Cond = "pass"
	Fail      Cond = "fail"
)

type RunStatus string

const (
	RunPending     RunStatus = "pending"
	RunRunning     RunStatus = "running"
	RunBlocked     RunStatus = "blocked"
	RunFailed      RunStatus = "failed"
	RunDone        RunStatus = "done"
	RunInterrupted RunStatus = "interrupted"
)

type NodeStatus string

const (
	NodePending     NodeStatus = "pending"
	NodeRunning     NodeStatus = "running"
	NodeBlocked     NodeStatus = "blocked"
	NodeFailed      NodeStatus = "failed"
	NodeDone        NodeStatus = "done"
	NodeTimeout     NodeStatus = "timeout"
	NodeInterrupted NodeStatus = "interrupted"
)

type Workflow struct {
	ID         string `json:"id"`
	Name       string `json:"name"`
	RootNodeID string `json:"root_node_id"`
	Nodes      []Node `json:"nodes"`
	Edges      []Edge `json:"edges"`
	UpdatedAt  int64  `json:"updated_at"`
}

type Node struct {
	ID              string   `json:"id"`
	Kind            Kind     `json:"kind"`
	Title           string   `json:"title"`
	Agent           string   `json:"agent"`
	ToolID          string   `json:"tool_id,omitempty"`
	X               float64  `json:"x,omitempty"`
	Y               float64  `json:"y,omitempty"`
	Skills          []string `json:"skills"`
	Prompt          string   `json:"prompt"`
	TimeoutMS       int64    `json:"timeout_ms"`
	RetryLimit      int      `json:"retry_limit"`
	ModelProviderID string   `json:"model_provider_id,omitempty"`
	ModelID         string   `json:"model_id,omitempty"`
	Variant         string   `json:"variant,omitempty"`
}

type Edge struct {
	ID    string `json:"id"`
	From  string `json:"from"`
	To    string `json:"to"`
	Cond  Cond   `json:"cond"`
	Label string `json:"label"`
}

type Run struct {
	ID              string    `json:"id"`
	WorkflowID      string    `json:"workflow_id"`
	WorkspacePath   string    `json:"workspace_path"`
	SessionID       string    `json:"session_id"`
	ModelProviderID string    `json:"model_provider_id,omitempty"`
	ModelID         string    `json:"model_id,omitempty"`
	Variant         string    `json:"variant,omitempty"`
	Status          RunStatus `json:"status"`
	CurrentNodeID   string    `json:"current_node_id"`
	BlockReason     string    `json:"block_reason,omitempty"`
	BlockRequestID  string    `json:"block_request_id,omitempty"`
	Input           string    `json:"input"`
	Loop            int       `json:"loop"`
	StartedAt       int64     `json:"started_at"`
	EndedAt         int64     `json:"ended_at,omitempty"`
	Error           string    `json:"error,omitempty"`
}

type NodeRun struct {
	ID             string     `json:"id"`
	RunID          string     `json:"run_id"`
	NodeID         string     `json:"node_id"`
	SessionID      string     `json:"session_id"`
	Status         NodeStatus `json:"status"`
	Turn           int        `json:"turn"`
	Input          string     `json:"input"`
	Output         string     `json:"output,omitempty"`
	BlockReason    string     `json:"block_reason,omitempty"`
	BlockRequestID string     `json:"block_request_id,omitempty"`
	Error          string     `json:"error,omitempty"`
	StartedAt      int64      `json:"started_at"`
	EndedAt        int64      `json:"ended_at,omitempty"`
	Anchor         Anchor     `json:"anchor"`
	Result         Result     `json:"result"`
}

type Anchor struct {
	StartedAt     int64  `json:"started_at"`
	LastMessageID string `json:"last_message_id,omitempty"`
}

type Result struct {
	Raw          string   `json:"raw,omitempty"`
	Text         string   `json:"text,omitempty"`
	Structured   string   `json:"structured,omitempty"`
	Handoff      string   `json:"handoff,omitempty"`
	Pass         *bool    `json:"pass,omitempty"`
	Route        string   `json:"route,omitempty"`
	Issues       []string `json:"issues,omitempty"`
	Steps        []string `json:"steps,omitempty"`
	Deliverables []string `json:"deliverables,omitempty"`
	Risks        []string `json:"risks,omitempty"`
}

type List struct {
	Items []Workflow `json:"items"`
}

type RunList struct {
	Items []Run `json:"items"`
}

type NodeRunList struct {
	Items []NodeRun `json:"items"`
}

type Summary struct {
	WorkflowID    string        `json:"workflow_id"`
	TotalRuns     int           `json:"total_runs"`
	DoneRuns      int           `json:"done_runs"`
	FailedRuns    int           `json:"failed_runs"`
	BlockedRuns   int           `json:"blocked_runs"`
	RunningRuns   int           `json:"running_runs"`
	AvgRunMS      int64         `json:"avg_run_ms"`
	LastRunAt     int64         `json:"last_run_at,omitempty"`
	TotalNodeRuns int           `json:"total_node_runs"`
	Nodes         []NodeSummary `json:"nodes"`
}

type NodeSummary struct {
	NodeID     string     `json:"node_id"`
	Kind       Kind       `json:"kind"`
	Title      string     `json:"title"`
	Total      int        `json:"total"`
	Done       int        `json:"done"`
	Failed     int        `json:"failed"`
	Blocked    int        `json:"blocked"`
	Running    int        `json:"running"`
	Timeout    int        `json:"timeout"`
	Pass       int        `json:"pass"`
	Fail       int        `json:"fail"`
	AvgMS      int64      `json:"avg_ms"`
	LastRunAt  int64      `json:"last_run_at,omitempty"`
	LastStatus NodeStatus `json:"last_status"`
}

type StartResult struct {
	Run     Run     `json:"run"`
	NodeRun NodeRun `json:"node_run"`
}

type ContinueResult struct {
	Run Run `json:"run"`
}

type WorkspaceStatus string

const (
	WorkspaceIdle        WorkspaceStatus = "idle"
	WorkspaceRunning     WorkspaceStatus = "running"
	WorkspaceBlocked     WorkspaceStatus = "blocked"
	WorkspaceDone        WorkspaceStatus = "done"
	WorkspaceFailed      WorkspaceStatus = "failed"
	WorkspaceInterrupted WorkspaceStatus = "interrupted"
)

type WorkspaceState struct {
	WorkspacePath   string          `json:"workspace_path"`
	Status          WorkspaceStatus `json:"status"`
	SessionID       string          `json:"session_id,omitempty"`
	WorkflowID      string          `json:"workflow_id,omitempty"`
	ModelProviderID string          `json:"model_provider_id,omitempty"`
	ModelID         string          `json:"model_id,omitempty"`
	Variant         string          `json:"variant,omitempty"`
	RunID           string          `json:"run_id,omitempty"`
	UpdatedAt       int64           `json:"updated_at"`
}

type WorkspaceSnapshot struct {
	State WorkspaceState `json:"state"`
	Run   *Run           `json:"run,omitempty"`
}
