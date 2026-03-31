package runtime

import (
	"archive/zip"
	"io"
	"io/fs"
	"os"
	"path/filepath"
	"strings"
)

func unzip(src string, dst string) error {
	file, err := zip.OpenReader(src)
	if err != nil {
		return err
	}
	defer file.Close()

	for _, item := range file.File {
		name := filepath.Clean(item.Name)
		if name == "." {
			continue
		}

		path := filepath.Join(dst, name)
		if !strings.HasPrefix(path, filepath.Clean(dst)+string(os.PathSeparator)) && filepath.Clean(path) != filepath.Clean(dst) {
			return fs.ErrPermission
		}

		if item.FileInfo().IsDir() {
			err = os.MkdirAll(path, 0o755)
			if err != nil {
				return err
			}
			continue
		}

		err = os.MkdirAll(filepath.Dir(path), 0o755)
		if err != nil {
			return err
		}

		in, err := item.Open()
		if err != nil {
			return err
		}

		out, err := os.OpenFile(path, os.O_CREATE|os.O_TRUNC|os.O_WRONLY, mode(item.Mode()))
		if err != nil {
			_ = in.Close()
			return err
		}

		_, err = io.Copy(out, in)
		closeIn := in.Close()
		closeOut := out.Close()
		if err != nil {
			return err
		}
		if closeIn != nil {
			return closeIn
		}
		if closeOut != nil {
			return closeOut
		}
	}

	return nil
}

func mode(src fs.FileMode) fs.FileMode {
	out := src.Perm()
	if out == 0 {
		return 0o644
	}
	if out&0o200 == 0 {
		return out | 0o200
	}
	return out
}
