package ipc

import "testing"

func TestUserDataFor(t *testing.T) {
	home := func() (string, error) {
		return "/home/test", nil
	}

	path, err := userDataFor("linux", "IDE", func(key string) string {
		if key == "XDG_CONFIG_HOME" {
			return "/tmp/cfg"
		}
		return ""
	}, home)
	if err != nil {
		t.Fatal(err)
	}
	if path != "/tmp/cfg/IDE" {
		t.Fatalf("unexpected linux path: %s", path)
	}

	path, err = userDataFor("darwin", "IDE", func(string) string { return "" }, home)
	if err != nil {
		t.Fatal(err)
	}
	if path != "/home/test/Library/Application Support/IDE" {
		t.Fatalf("unexpected darwin path: %s", path)
	}
}

func TestHandleFor(t *testing.T) {
	path := handleFor("windows", `C:\Users\Admin\AppData\Roaming\IDE`, "IDESmartXServer", "")
	want := `\\.\pipe\c2ab116aa755084b9d2358757176be6f--IDESmartXServer-sock`
	if path != want {
		t.Fatalf("unexpected windows handle: %s", path)
	}

	path = handleFor("linux", "/tmp/ide", "IDEContinueServer", "")
	if path != "/tmp/ide/-IDEContinueServer.sock" {
		t.Fatalf("unexpected unix handle: %s", path)
	}
}

func TestValidate(t *testing.T) {
	if !validate("linux", "/tmp/a.sock") {
		t.Fatal("expected short path to be valid")
	}
	if validate("linux", "/"+"0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz0123456789abcdefghijklmnopqrstuvwxyz.sock") {
		t.Fatal("expected long path to be invalid")
	}
}
