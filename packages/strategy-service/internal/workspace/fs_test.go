package workspace

import "testing"

func TestDecodeUTF16LEText(t *testing.T) {
	body := []byte{0xff, 0xfe, '#', 0, ' ', 0, 's', 0, 't', 0, 'a', 0, 'r', 0, 't', 0, '.', 0, 'p', 0, 'y', 0, '\n', 0}
	value, ok := decode(body)
	if !ok {
		t.Fatal("expected utf16 text to be previewable")
	}
	if value != "# start.py\n" {
		t.Fatalf("unexpected decoded content: %q", value)
	}
}

func TestDecodeBinaryWithNUL(t *testing.T) {
	_, ok := decode([]byte{0, 1, 2, 3, 4, 5})
	if ok {
		t.Fatal("expected binary content to be rejected")
	}
}

func TestDecodePythonUTF8Text(t *testing.T) {
	value, ok := decode([]byte("# -*- coding: utf-8 -*-\nprint('hi')\n"))
	if !ok {
		t.Fatal("expected utf8 python to be previewable")
	}
	if value == "" {
		t.Fatal("expected decoded content")
	}
}
