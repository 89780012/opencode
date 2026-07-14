package bootstrap

import "testing"

func TestLoadConfigDefaultsPythonLayoutToProduction(t *testing.T) {
	t.Setenv("SMARTX_PYTHON_LAYOUT", "")

	cfg := LoadConfig()
	if cfg.Opencode.PythonLayout != "production" {
		t.Fatalf("unexpected default Python layout: %q", cfg.Opencode.PythonLayout)
	}
}

func TestLoadConfigSupportsDevelopmentPythonLayout(t *testing.T) {
	t.Setenv("SMARTX_PYTHON_LAYOUT", " Development ")

	cfg := LoadConfig()
	if cfg.Opencode.PythonLayout != "development" {
		t.Fatalf("unexpected development Python layout: %q", cfg.Opencode.PythonLayout)
	}
}

func TestLoadConfigSupportsProductionPythonLayout(t *testing.T) {
	t.Setenv("SMARTX_PYTHON_LAYOUT", " Production ")

	cfg := LoadConfig()
	if cfg.Opencode.PythonLayout != "production" {
		t.Fatalf("unexpected production Python layout: %q", cfg.Opencode.PythonLayout)
	}
}

func TestLoadConfigRejectsUnknownPythonLayout(t *testing.T) {
	t.Setenv("SMARTX_PYTHON_LAYOUT", "custom")

	cfg := LoadConfig()
	if cfg.Opencode.PythonLayout != "custom" {
		t.Fatalf("unknown Python layout was unexpectedly rewritten: %q", cfg.Opencode.PythonLayout)
	}
	if _, err := New(cfg); err == nil {
		t.Fatal("expected unknown Python layout to fail service initialization")
	} else if err.Error() != `invalid SMARTX_PYTHON_LAYOUT "custom": expected production or development` {
		t.Fatalf("unexpected Python layout error: %v", err)
	}
}
