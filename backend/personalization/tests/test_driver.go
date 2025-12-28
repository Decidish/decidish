package tests

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
)

func NewMockEmbedderServer() *httptest.Server {
	return httptest.NewServer(http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// read request body to determine how many embeddings to return
		var req struct {
			RecipeStrs []string `json:"text"`
		}
		if err := json.NewDecoder(r.Body).Decode(&req); err != nil {
			http.Error(w, "bad request", http.StatusBadRequest)
			return
		}
		// produce embedding for each input string
		embs := make([][]float64, len(req.RecipeStrs))
		for i := range req.RecipeStrs {
			embs[i] = []float64{float64(i) + 0.1, float64(i) + 0.2}
		}
		resp := map[string]interface{}{
			"device":     "cpu",
			"model":      "m",
			"embeddings": embs,
		}
		buf := &bytes.Buffer{}
		if err := json.NewEncoder(buf).Encode(resp); err != nil {
			http.Error(w, "encode error", http.StatusInternalServerError)
			return
		}
		w.Header().Set("Content-Type", "application/json")
		w.WriteHeader(http.StatusOK)
		w.Write(buf.Bytes())
	}))
}
