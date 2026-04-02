package es

import (
	"bytes"
	"context"
	"crypto/tls"
	"encoding/json"
	"fmt"
	"io"
	"net/http"
	"strings"
	"time"

	elastic "github.com/elastic/go-elasticsearch/v8"
	"github.com/elastic/go-elasticsearch/v8/esapi"
)

type Service struct {
	cli   *elastic.Client
	index string
}

type Doc struct {
	Title string  `json:"title"`
	Value string  `json:"value"`
	Score float64 `json:"score,omitempty"`
}

func New(addr []string, user string, pass string, timeout time.Duration, insecure bool, index string) (*Service, error) {
	tp := http.DefaultTransport.(*http.Transport).Clone()
	if insecure {
		tp.TLSClientConfig = &tls.Config{InsecureSkipVerify: true}
	}
	tp.ResponseHeaderTimeout = timeout

	cli, err := elastic.NewClient(elastic.Config{
		Addresses: addr,
		Username:  user,
		Password:  pass,
		Transport: tp,
	})
	if err != nil {
		return nil, err
	}

	svc := &Service{
		cli:   cli,
		index: index,
	}
	if err := svc.ensure(context.Background()); err != nil {
		return nil, err
	}
	return svc, nil
}

func (s *Service) ensure(ctx context.Context) error {
	res, err := s.cli.Indices.Exists([]string{s.index}, s.cli.Indices.Exists.WithContext(ctx))
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.StatusCode == http.StatusOK {
		return nil
	}
	if res.StatusCode != http.StatusNotFound {
		return readErr(res)
	}

	body := strings.NewReader(`{
		"settings": {
			"analysis": {
				"analyzer": {
					"title_analyzer": {
						"type": "standard"
					}
				}
			}
		},
		"mappings": {
			"properties": {
				"title": {
					"type": "text",
					"analyzer": "title_analyzer",
					"fields": {
						"keyword": {
							"type": "keyword",
							"ignore_above": 256
						}
					}
				},
				"value": {
					"type": "text"
				}
			}
		}
	}`)

	res, err = s.cli.Indices.Create(s.index, s.cli.Indices.Create.WithContext(ctx), s.cli.Indices.Create.WithBody(body))
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.IsError() {
		return readErr(res)
	}
	return nil
}

func (s *Service) Ping(ctx context.Context) error {
	res, err := s.cli.Ping(s.cli.Ping.WithContext(ctx))
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.IsError() {
		return readErr(res)
	}
	return nil
}

func (s *Service) Upsert(ctx context.Context, doc Doc) error {
	body, err := json.Marshal(doc)
	if err != nil {
		return err
	}

	res, err := s.cli.Index(
		s.index,
		bytes.NewReader(body),
		s.cli.Index.WithContext(ctx),
		s.cli.Index.WithDocumentID(doc.Title),
		s.cli.Index.WithRefresh("true"),
	)
	if err != nil {
		return err
	}
	defer res.Body.Close()

	if res.IsError() {
		return readErr(res)
	}
	return nil
}

func (s *Service) Search(ctx context.Context, title string, size int) ([]Doc, error) {
	body := map[string]any{
		"size": size,
		"query": map[string]any{
			"bool": map[string]any{
				"should": []any{
					map[string]any{
						"match_phrase": map[string]any{
							"title": map[string]any{
								"query": title,
								"boost": 5,
							},
						},
					},
					map[string]any{
						"match": map[string]any{
							"title": map[string]any{
								"query":     title,
								"operator":  "and",
								"boost":     3,
								"fuzziness": "AUTO",
							},
						},
					},
					map[string]any{
						"match": map[string]any{
							"title": map[string]any{
								"query": title,
								"boost": 1,
							},
						},
					},
				},
				"minimum_should_match": 1,
			},
		},
		"_source": []string{"title", "value"},
	}

	data, err := json.Marshal(body)
	if err != nil {
		return nil, err
	}

	res, err := s.cli.Search(
		s.cli.Search.WithContext(ctx),
		s.cli.Search.WithIndex(s.index),
		s.cli.Search.WithBody(bytes.NewReader(data)),
	)
	if err != nil {
		return nil, err
	}
	defer res.Body.Close()

	if res.IsError() {
		return nil, readErr(res)
	}

	var out struct {
		Hits struct {
			Hits []struct {
				Score  float64 `json:"_score"`
				Source Doc     `json:"_source"`
			} `json:"hits"`
		} `json:"hits"`
	}
	if err := json.NewDecoder(res.Body).Decode(&out); err != nil {
		return nil, err
	}

	return mapHits(out.Hits.Hits), nil
}

func mapHits(hits []struct {
	Score  float64 `json:"_score"`
	Source Doc     `json:"_source"`
}) []Doc {
	return func() []Doc {
		out := make([]Doc, 0, len(hits))
		for _, hit := range hits {
			doc := hit.Source
			doc.Score = hit.Score
			out = append(out, doc)
		}
		return out
	}()
}

func readErr(res *esapi.Response) error {
	body, err := io.ReadAll(res.Body)
	if err != nil {
		return fmt.Errorf("elasticsearch error: status=%s", res.Status())
	}
	text := strings.TrimSpace(string(body))
	if text == "" {
		return fmt.Errorf("elasticsearch error: status=%s", res.Status())
	}
	return fmt.Errorf("elasticsearch error: status=%s body=%s", res.Status(), text)
}
