package workflow

type Kind string

const (
	Start  Kind = "start"
	Plan   Kind = "plan"
	Build  Kind = "build"
	Judge  Kind = "judge"
	Review Kind = "review"
	End    Kind = "end"
	Gate   Kind = "gate"
)

type Mode string

const (
	Shared   Mode = "shared"
	Isolated Mode = "isolated"
	Keyed    Mode = "keyed"
)

type Cond string

const (
	Always Cond = "always"
	Pass   Cond = "pass"
	Fail   Cond = "fail"
)

type RunStatus string

const (
	RunPending RunStatus = "pending"
	RunRunning RunStatus = "running"
	RunBlocked RunStatus = "blocked"
	RunFailed  RunStatus = "failed"
	RunDone    RunStatus = "done"
)

type NodeStatus string

const (
	NodePending NodeStatus = "pending"
	NodeRunning NodeStatus = "running"
	NodeBlocked NodeStatus = "blocked"
	NodeFailed  NodeStatus = "failed"
	NodeDone    NodeStatus = "done"
	NodeTimeout NodeStatus = "timeout"
)

type Workflow struct {
	ID            string `json:"id"`
	Name          string `json:"name"`
	WorkspacePath string `json:"workspace_path"`
	RootNodeID    string `json:"root_node_id"`
	Nodes         []Node `json:"nodes"`
	Edges         []Edge `json:"edges"`
	UpdatedAt     int64  `json:"updated_at"`
}

type Node struct {
	ID              string   `json:"id"`
	Kind            Kind     `json:"kind"`
	Title           string   `json:"title"`
	Agent           string   `json:"agent"`
	Skills          []string `json:"skills"`
	Session         Mode     `json:"session_mode"`
	SessionKey      string   `json:"session_key,omitempty"`
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
	ID             string            `json:"id"`
	WorkflowID     string            `json:"workflow_id"`
	WorkspacePath  string            `json:"workspace_path"`
	RootSessionID  string            `json:"root_session_id"`
	Lanes          map[string]string `json:"lanes,omitempty"`
	Status         RunStatus         `json:"status"`
	CurrentNodeID  string            `json:"current_node_id"`
	BlockReason    string            `json:"block_reason,omitempty"`
	BlockRequestID string            `json:"block_request_id,omitempty"`
	Input          string            `json:"input"`
	Loop           int               `json:"loop"`
	StartedAt      int64             `json:"started_at"`
	EndedAt        int64             `json:"ended_at,omitempty"`
	Error          string            `json:"error,omitempty"`
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
	Raw        string `json:"raw,omitempty"`
	Text       string `json:"text,omitempty"`
	Structured string `json:"structured,omitempty"`
	NextPrompt string `json:"next_prompt,omitempty"`
	Pass       *bool  `json:"pass,omitempty"`
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

type StartResult struct {
	Run     Run     `json:"run"`
	NodeRun NodeRun `json:"node_run"`
}

type ContinueResult struct {
	Run Run `json:"run"`
}
