package modelchain

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"
	"time"
)

type fixed struct {
	cfg Config
}

func (f fixed) load() (Config, error) {
	return f.cfg, nil
}

func (f fixed) save(cfg Config) (Config, error) {
	return cfg, nil
}

type endpoint struct {
	url *url.URL
}

type call struct {
	model Model
	path  string
	dir   string
}

type hit struct {
	call  chan call
	abort chan struct{}
}

func (e endpoint) Target() *url.URL {
	return e.url
}

func capture(t *testing.T, cfg Config) (*Service, hit) {
	t.Helper()
	hits := hit{call: make(chan call, 10), abort: make(chan struct{}, 10)}
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if strings.HasSuffix(r.URL.Path, "/abort") {
			hits.abort <- struct{}{}
			w.WriteHeader(http.StatusOK)
			return
		}
		var body struct {
			Model Model `json:"model"`
		}
		if err := json.NewDecoder(r.Body).Decode(&body); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}
		hits.call <- call{model: body.Model, path: r.URL.Path, dir: r.URL.Query().Get("directory")}
		w.WriteHeader(http.StatusOK)
	}))
	t.Cleanup(server.Close)
	addr, err := url.Parse(server.URL)
	if err != nil {
		t.Fatal(err)
	}
	svc := NewService(endpoint{url: addr})
	svc.store = fixed{cfg: cfg}
	return svc, hits
}

func finish(id string, reason string, model string) []byte {
	data, _ := json.Marshal(map[string]any{
		"type": "message.updated",
		"properties": map[string]any{
			"info": map[string]any{
				"id":         id,
				"role":       "assistant",
				"sessionID":  "session",
				"providerID": "provider",
				"modelID":    model,
				"finish":     reason,
			},
		},
	})
	return data
}

func take(t *testing.T, calls chan call) call {
	t.Helper()
	select {
	case got := <-calls:
		return got
	case <-time.After(time.Second):
		t.Fatal("model request was not sent")
		return call{}
	}
}

func none(t *testing.T, calls chan call) {
	t.Helper()
	select {
	case <-calls:
		t.Fatal("unexpected model request was sent")
	case <-time.After(50 * time.Millisecond):
	}
}

func TestIdleClearsCompletedPrompt(t *testing.T) {
	svc := NewService(nil)
	svc.track(Prompt{SessionID: "session", Model: Model{ProviderID: "provider", ModelID: "model"}})

	svc.Event([]byte(`{"type":"session.status","properties":{"sessionID":"session","status":{"type":"busy"}}}`))
	svc.Event([]byte(`{"type":"session.status","properties":{"sessionID":"session","status":{"type":"idle"}}}`))

	if _, ok := svc.prompts["session"]; ok {
		t.Fatal("completed prompt was not cleared")
	}
	if _, ok := svc.used["session"]; ok {
		t.Fatal("completed model history was not cleared")
	}
	if _, ok := svc.seen["session"]; ok {
		t.Fatal("completed message history was not cleared")
	}
	if _, ok := svc.resume["session"]; ok {
		t.Fatal("completed recovery state was not cleared")
	}
	if _, ok := svc.swap["session"]; ok {
		t.Fatal("completed fallback state was not cleared")
	}
	if _, ok := svc.active["session"]; ok {
		t.Fatal("completed activity state was not cleared")
	}
	if _, ok := svc.gen["session"]; ok {
		t.Fatal("completed prompt generation was not cleared")
	}
}

func TestIdleDoesNotClearPromptBeforeBusy(t *testing.T) {
	svc := NewService(nil)
	svc.track(Prompt{SessionID: "session", Model: Model{ProviderID: "provider", ModelID: "model"}})

	svc.Event([]byte(`{"type":"session.status","properties":{"sessionID":"session","status":{"type":"idle"}}}`))

	if _, ok := svc.prompts["session"]; !ok {
		t.Fatal("stale idle cleared a prompt that has not started")
	}
}

func TestIdleKeepsFallbackUntilReplacementCompletes(t *testing.T) {
	svc := NewService(nil)
	svc.track(Prompt{SessionID: "session", Model: Model{ProviderID: "provider", ModelID: "model"}})
	svc.ready("session")
	svc.swap["session"] = true

	svc.idle("session")
	if _, ok := svc.prompts["session"]; !ok {
		t.Fatal("idle cleared an in-flight fallback")
	}

	svc.ready("session")
	svc.idle("session")
	if _, ok := svc.prompts["session"]; ok {
		t.Fatal("fallback prompt was not cleared after completion")
	}
}

func TestDropDoesNotClearNewerPrompt(t *testing.T) {
	svc := NewService(nil)
	old := svc.track(Prompt{SessionID: "session", Model: Model{ProviderID: "provider", ModelID: "old"}})
	current := svc.track(Prompt{SessionID: "session", Model: Model{ProviderID: "provider", ModelID: "current"}})

	svc.drop("session", old)
	if svc.prompts["session"].Model.ModelID != "current" {
		t.Fatal("stale cleanup removed the current prompt")
	}

	svc.drop("session", current)
	if _, ok := svc.prompts["session"]; ok {
		t.Fatal("current prompt was not cleared")
	}
}

func TestPromptFailureClearsTracking(t *testing.T) {
	server := httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, _ *http.Request) {
		http.Error(w, "unavailable", http.StatusServiceUnavailable)
	}))
	defer server.Close()

	addr, err := url.Parse(server.URL)
	if err != nil {
		t.Fatal(err)
	}
	svc := NewService(endpoint{url: addr})
	svc.store = fixed{cfg: Config{Chain: []Model{{ProviderID: "provider", ModelID: "model"}}}}
	err = svc.Prompt(context.Background(), Prompt{
		WorkspacePath: "workspace",
		SessionID:     "session",
		Parts:         []map[string]any{{"type": "text", "text": "request"}},
	})
	if err == nil {
		t.Fatal("prompt unexpectedly succeeded")
	}
	if _, ok := svc.prompts["session"]; ok {
		t.Fatal("failed prompt was not cleared")
	}
}

func TestOtherFinishRetriesCurrentModelOnce(t *testing.T) {
	svc, hits := capture(t, Config{Chain: []Model{
		{ProviderID: "provider", ModelID: "first"},
		{ProviderID: "provider", ModelID: "second"},
	}})
	svc.track(Prompt{
		WorkspacePath: "workspace",
		SessionID:     "session",
		Model:         Model{ProviderID: "provider", ModelID: "first"},
		Parts:         []map[string]any{{"type": "text", "text": "request"}},
	})
	svc.ready("session")

	evt := finish("assistant-1", "other", "first")
	svc.Event(evt)
	svc.Event(evt)

	got := take(t, hits.call)
	if got.model.ModelID != "first" {
		t.Fatalf("recovery model = %q, want first", got.model.ModelID)
	}
	if got.path != "/session/session/prompt_async" {
		t.Fatalf("recovery path = %q", got.path)
	}
	if got.dir != "workspace" {
		t.Fatalf("recovery directory = %q", got.dir)
	}
	none(t, hits.call)
}

func TestSecondOtherFinishFallsBack(t *testing.T) {
	svc, hits := capture(t, Config{Chain: []Model{
		{ProviderID: "provider", ModelID: "first"},
		{ProviderID: "provider", ModelID: "second"},
	}})
	svc.track(Prompt{
		WorkspacePath: "workspace",
		SessionID:     "session",
		Model:         Model{ProviderID: "provider", ModelID: "first"},
		Parts:         []map[string]any{{"type": "text", "text": "request"}},
	})
	svc.ready("session")

	svc.Event(finish("assistant-1", "other", "first"))
	if got := take(t, hits.call); got.model.ModelID != "first" {
		t.Fatalf("recovery model = %q, want first", got.model.ModelID)
	}
	svc.ready("session")
	svc.Event(finish("assistant-2", "other", "first"))
	if got := take(t, hits.call); got.model.ModelID != "second" {
		t.Fatalf("fallback model = %q, want second", got.model.ModelID)
	}
}

func TestStopResetsOtherRecovery(t *testing.T) {
	svc, hits := capture(t, Config{Chain: []Model{
		{ProviderID: "provider", ModelID: "first"},
		{ProviderID: "provider", ModelID: "second"},
	}})
	svc.track(Prompt{
		WorkspacePath: "workspace",
		SessionID:     "session",
		Model:         Model{ProviderID: "provider", ModelID: "first"},
		Parts:         []map[string]any{{"type": "text", "text": "request"}},
	})
	svc.ready("session")

	svc.Event(finish("assistant-1", "other", "first"))
	take(t, hits.call)
	svc.ready("session")
	svc.Event(finish("assistant-2", "stop", "first"))
	svc.Event(finish("assistant-3", "other", "first"))
	if got := take(t, hits.call); got.model.ModelID != "first" {
		t.Fatalf("recovery model after stop = %q, want first", got.model.ModelID)
	}
}

func TestStaleStopDoesNotResetOtherRecovery(t *testing.T) {
	svc := NewService(nil)
	svc.track(Prompt{SessionID: "session", Model: Model{ProviderID: "provider", ModelID: "second"}})
	svc.ready("session")
	svc.resume["session"] = "provider/second"

	svc.Event(finish("assistant-1", "stop", "first"))

	if svc.resume["session"] != "provider/second" {
		t.Fatal("stale stop reset current model recovery")
	}
}

func TestRetryThresholdFallsBackOnce(t *testing.T) {
	svc, hits := capture(t, Config{Chain: []Model{
		{ProviderID: "provider", ModelID: "first"},
		{ProviderID: "provider", ModelID: "second"},
	}})
	svc.track(Prompt{
		WorkspacePath: "workspace",
		SessionID:     "session",
		Model:         Model{ProviderID: "provider", ModelID: "first"},
		Parts:         []map[string]any{{"type": "text", "text": "request"}},
	})
	svc.ready("session")

	svc.Event([]byte(`{"type":"session.status","properties":{"sessionID":"session","status":{"type":"retry","attempt":2,"message":"limited"}}}`))
	none(t, hits.call)
	svc.Event([]byte(`{"type":"session.status","properties":{"sessionID":"session","status":{"type":"retry","attempt":3,"message":"limited"}}}`))
	if got := take(t, hits.call); got.model.ModelID != "second" {
		t.Fatalf("fallback model = %q, want second", got.model.ModelID)
	}
	svc.Event([]byte(`{"type":"session.status","properties":{"sessionID":"session","status":{"type":"retry","attempt":4,"message":"limited"}}}`))
	none(t, hits.call)
}

func TestExhaustedChainAbortsAndCleansTracking(t *testing.T) {
	svc, hits := capture(t, Config{Chain: []Model{{ProviderID: "provider", ModelID: "first"}}})
	svc.track(Prompt{
		WorkspacePath: "workspace",
		SessionID:     "session",
		Model:         Model{ProviderID: "provider", ModelID: "first"},
		Parts:         []map[string]any{{"type": "text", "text": "request"}},
	})
	svc.ready("session")

	svc.Event([]byte(`{"type":"session.status","properties":{"sessionID":"session","status":{"type":"retry","attempt":3,"message":"limited"}}}`))
	select {
	case <-hits.abort:
	case <-time.After(time.Second):
		t.Fatal("exhausted chain did not abort current model")
	}
	for range 100 {
		if _, ok := svc.prompts["session"]; !ok {
			return
		}
		time.Sleep(time.Millisecond)
	}
	t.Fatal("exhausted chain did not clear tracking")
}

func TestStopFinishDoesNotFallback(t *testing.T) {
	svc := NewService(nil)
	svc.track(Prompt{SessionID: "session", Model: Model{ProviderID: "provider", ModelID: "first"}})
	svc.ready("session")

	svc.Event([]byte(`{"type":"message.updated","properties":{"info":{"role":"assistant","sessionID":"session","finish":"stop"}}}`))

	if svc.swap["session"] {
		t.Fatal("normal stop started a fallback")
	}
	if len(svc.used["session"]) != 1 {
		t.Fatalf("used models = %d, want 1", len(svc.used["session"]))
	}
}

func TestOtherFinishBeforeBusyDoesNotFallback(t *testing.T) {
	svc := NewService(nil)
	svc.track(Prompt{SessionID: "session", Model: Model{ProviderID: "provider", ModelID: "first"}})

	svc.Event(finish("assistant-1", "other", "first"))

	if svc.swap["session"] {
		t.Fatal("stale finish event started a fallback before the prompt became busy")
	}
}
