Place packaged builtin runtimes here.

Expected layout:

- `windows-x64/git.zip`
- `windows-arm64/git.zip`
- `linux-x64/git.zip`
- `linux-arm64/git.zip`
- `darwin-x64/git.zip`
- `darwin-arm64/git.zip`
- `windows-x64/opencode.zip`
- `windows-arm64/opencode.zip`
- `linux-x64/opencode.zip`
- `linux-arm64/opencode.zip`
- `darwin-x64/opencode.zip`
- `darwin-arm64/opencode.zip`
- `windows-x64/git/git.exe` or `windows-x64/git/cmd/git.exe`
- `windows-arm64/git/git.exe` or `windows-arm64/git/cmd/git.exe`
- `linux-x64/git/git` or `linux-x64/git/bin/git`
- `linux-arm64/git/git` or `linux-arm64/git/bin/git`
- `darwin-x64/git/git` or `darwin-x64/git/bin/git`
- `darwin-arm64/git/git` or `darwin-arm64/git/bin/git`
- `windows-x64/opencode/opencode.exe`
- `windows-arm64/opencode/opencode.exe`
- `linux-x64/opencode/opencode`
- `linux-arm64/opencode/opencode`
- `darwin-x64/opencode/opencode`
- `darwin-arm64/opencode/opencode`

The service prefers `.zip` archives and expands them into the user cache directory on first install.
Directory layout is still supported as a fallback during development.
Each target directory is copied next to the built service binary as `runtime/`.
