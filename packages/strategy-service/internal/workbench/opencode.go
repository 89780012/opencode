package workbench

import "net/url"

func (s *Service) addr(path string, dir string) string {
	base := *s.op.Target()
	ref := &url.URL{
		Path: path,
		RawQuery: url.Values{
			"directory": []string{dir},
		}.Encode(),
	}
	return base.ResolveReference(ref).String()
}
