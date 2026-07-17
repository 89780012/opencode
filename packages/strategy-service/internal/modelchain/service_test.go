package modelchain

import (
	"context"
	"net/http"
	"net/http/httptest"
	"net/url"
	"testing"
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

func (e endpoint) Target() *url.URL {
	return e.url
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
