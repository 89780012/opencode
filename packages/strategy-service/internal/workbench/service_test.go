package workbench

import (
	"strings"
	"testing"
)

func TestBriefKeepsNumberAndTextTogether(t *testing.T) {
	text := brief([]string{"use grid strategy.", "  "})

	if !strings.Contains(text, "1. use grid strategy.") {
		t.Fatalf("brief() = %q", text)
	}
	if strings.Contains(text, "1.\n") {
		t.Fatalf("brief() split number and text: %q", text)
	}
}
