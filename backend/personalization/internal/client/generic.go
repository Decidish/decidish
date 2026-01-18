package client

import (
	"bytes"
	"context"
	"encoding/json"
	"io"
	"net"
	"net/http"
	"time"

	"github.com/go-resty/resty/v2"
)

// Client wraps resty and a fallback net/http client.
type Client struct {
	resty *resty.Client
	http  *http.Client
}

// NewClient creates a Client with sensible timeouts and retries.
func NewClient() *Client {
	r := resty.New().
		SetTimeout(10 * time.Second).
		SetRetryCount(2).
		SetRetryWaitTime(500 * time.Millisecond)

	// Custom net/http client with timeouts
	h := &http.Client{
		Timeout: 10 * time.Second,
		Transport: &http.Transport{
			DialContext: (&net.Dialer{Timeout: 5 * time.Second}).DialContext,
		},
	}

	return &Client{resty: r, http: h}
}

// Get performs a GET and returns body bytes.
func (c *Client) Get(ctx context.Context, url string, headers map[string]string) ([]byte, int, error) {
	resp, err := c.resty.R().
		SetContext(ctx).
		SetHeaders(headers).
		Get(url)
	if err == nil {
		return resp.Body(), resp.StatusCode(), nil
	}

	// Fallback using net/http
	req, _ := http.NewRequestWithContext(ctx, http.MethodGet, url, nil)
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	response, err := c.http.Do(req)
	if err != nil {
		return nil, 0, err
	}
	defer func(Body io.ReadCloser) {
		_ = Body.Close()
	}(response.Body)
	b, _ := io.ReadAll(response.Body)
	return b, response.StatusCode, nil
}

// PostJSON posts a JSON payload and decodes JSON response into out.
func (c *Client) PostJSON(ctx context.Context, url string, payload interface{}, out interface{}, headers map[string]string) (int, error) {
	resp, err := c.resty.R().
		SetContext(ctx).
		SetBody(payload).
		SetHeaders(headers).
		SetHeader("Content-Type", "application/json").
		SetResult(out).
		Post(url)
	if err == nil {
		if resp.IsSuccess() && out != nil {
			// resty already decoded into out
		}
		return resp.StatusCode(), nil
	}

	// Fallback
	var buf bytes.Buffer
	if err := json.NewEncoder(&buf).Encode(payload); err != nil {
		return 0, err
	}
	req, _ := http.NewRequestWithContext(ctx, http.MethodPost, url, &buf)
	req.Header.Set("Content-Type", "application/json")
	for k, v := range headers {
		req.Header.Set(k, v)
	}
	response, err := c.http.Do(req)
	if err != nil {
		return 0, err
	}
	defer func(Body io.ReadCloser) {
		_ = Body.Close()
	}(response.Body)
	if out != nil {
		if err := json.NewDecoder(response.Body).Decode(out); err != nil && err != io.EOF {
			return response.StatusCode, err
		}
	}
	return response.StatusCode, nil
}
