package oprun

import (
	"strings"
	"testing"
)

func TestEnvInjectsPythonLayoutAndPreservesSmartHome(t *testing.T) {
	home := `D:\Smart Home (策略)\cpython`
	t.Setenv("SMART_HOME", home)
	t.Setenv("SMARTX_PYTHON_LAYOUT", "ambient")

	all := env(Config{PythonLayout: "development"})
	if value, ok := lookup(all, "SMARTX_PYTHON_LAYOUT"); !ok || value != "development" {
		t.Fatalf("unexpected Python layout: %q, found=%v", value, ok)
	}
	if value, ok := lookup(all, "SMART_HOME"); !ok || value != home {
		t.Fatalf("SMART_HOME changed while building OpenCode environment: %q, found=%v", value, ok)
	}
}

func lookup(all []string, key string) (string, bool) {
	pre := key + "="
	for _, item := range all {
		if strings.HasPrefix(item, pre) {
			return strings.TrimPrefix(item, pre), true
		}
	}
	return "", false
}
