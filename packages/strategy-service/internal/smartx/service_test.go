package smartx

import (
	"context"
	"testing"
	"time"
)

func TestTidy(t *testing.T) {
	got := tidy("\x1b[2J\x1b[m\x1b[HWelcome to smartx-cli tools V1.0.0\n\x1b]0;C:\\Users\\Admin\\AppData\\Local\\Programs\\xtp_rich_client\\smartx-cli.exe\a\x1b[?25hsmartx>connected\nsmartx>login 53191000978 1\nsmartx>password:123456\nsmartx>[0000]login success\nsmartx>\x1b[14X")
	want := "Welcome to smartx-cli tools V1.0.0\nsmartx>connected\nsmartx>login 53191000978 1\nsmartx>password:123456\nsmartx>[0000]login success\nsmartx>"
	if got != want {
		t.Fatalf("got %q want %q", got, want)
	}
}

func TestLive(t *testing.T) {
	if !live("smartx>[0000]extension is running\nsmartx>") {
		t.Fatal("expected running extension")
	}
	if live("smartx>[0000]extension stopped\nsmartx>") {
		t.Fatal("did not expect running extension")
	}
}

func TestWaitTailIgnoresOldPrompt(t *testing.T) {
	ctx, cancel := context.WithTimeout(context.Background(), 150*time.Millisecond)
	defer cancel()

	buf := &feed{}
	buf.add("smartx>")

	if err := waitTail(ctx, buf, buf.size(), []string{"smartx>"}, nil, "timeout"); err == nil {
		t.Fatal("expected timeout")
	}
}
