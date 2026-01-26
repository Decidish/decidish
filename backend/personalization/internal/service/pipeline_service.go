package service

import (
	"database/sql"
	"fmt"
	"personalization/internal/client"
	"strconv"
	"strings"

	"github.com/gin-gonic/gin"
)

type TuneRequest struct {
	// Data Payloads
	UserEmb   [][]float64 `json:"user_emb"`
	RecipeEmb [][]float64 `json:"recipe_emb"`
	Like      []int       `json:"like"`

	// Pipeline Switches
	// NOTE: In Go, bool defaults to false. 
	// You must explicitly set these to true to match Python defaults.
	UseWeeklyUserAdapter bool `json:"use_weekly_user_adapter"` 
	DoOnlineBCE          bool `json:"do_online_bce"`

	// Online BCE Knobs (Optional)
	// 'omitempty' allows Python to use its defaults if these are 0/empty in Go
	BCESteps        int      `json:"bce_steps,omitempty"`
	BCELR           float64  `json:"bce_lr,omitempty"`
	BCETemperature  float64  `json:"bce_temperature,omitempty"`
	BCEL2Anchor     float64  `json:"bce_l2_anchor,omitempty"`
	BCEClipGradNorm float64  `json:"bce_clip_grad_norm,omitempty"`
	
	// Use pointer for Optional/Nullable fields
	BCEPosWeight    *float64 `json:"bce_pos_weight,omitempty"` 

	MaxBatchSize int `json:"max_batch_size,omitempty"`
}

func NewDefaultTuneRequest(userEmb, recipeEmb [][]float64, likes []int) TuneRequest {
	return TuneRequest{
		UserEmb:              userEmb,
		RecipeEmb:            recipeEmb,
		Like:                 likes,
		UseWeeklyUserAdapter: true,
		DoOnlineBCE:          false,
		BCESteps:             5,
		BCELR:                5e-2,
		BCETemperature:       0.07,
		BCEL2Anchor:          1e-2,
		BCEClipGradNorm:      5.0,
		MaxBatchSize:         512,
	}
}

type TuneResponse struct {
	UpdatedUserEmb [][]float64    `json:"updated_user_emb"`
	Metrics        map[string]float64 `json:"metrics"`
	ModelInfo      map[string]any `json:"model_info"`
}

func UpdateNewUserEmbedding(ctx *gin.Context, db *sql.DB, MLClient *client.Client, embedderServerUrl string, actionId int, userId string, recipeId string, action bool) error {
	var userEmbStr, recipeEmbStr string

	tx , err := db.Begin()
	if err != nil {
		return err
	}

	defer tx.Rollback()

    // Note: I cleaned up the SQL slightly to use explicit JOINs which is safer
    err = tx.QueryRow(`
        SELECT u.embedding, r.embedding
        FROM user_history uh
        JOIN user_embeddings u ON uh.user_id = u.user_id
        JOIN recipe_embeddings r ON uh.recipe_id = r.id
        WHERE uh.id = $1
    `, actionId).Scan(&userEmbStr, &recipeEmbStr, &action)

	if err != nil {
		return err
	}

	userVec, err := parsePostgresVector(userEmbStr)
    if err != nil { return err }

    recipeVec, err := parsePostgresVector(recipeEmbStr)
    if err != nil { return err }

	var req TuneRequest

	if action {
		req = NewDefaultTuneRequest([][]float64{userVec}, [][]float64{recipeVec}, []int{1})
	} else {
		req = NewDefaultTuneRequest([][]float64{userVec}, [][]float64{recipeVec}, []int{0})
	}

	var mlResp TuneResponse

	status, err := MLClient.PostJSON(ctx.Request.Context(), fmt.Sprintf("%s/recipes/add", embedderServerUrl), req, &mlResp, nil)
	if err != nil {
		return err
	}
	if status < 200 || status >= 300 {
		return fmt.Errorf("ML service returned non-2xx status: %d", status)
	}

	updatedEmbStr := fmt.Sprintf("[%s]", strings.Trim(strings.Replace(fmt.Sprint(mlResp.UpdatedUserEmb[0]), " ", ", ", -1), "[]"))

	_, err = tx.Exec(`
		UPDATE user_embeddings
		SET embedding = $1, updated_at = NOW()
		WHERE user_id = $2
	`, updatedEmbStr, userId)
	if err != nil {
		return err
	}

	if err = tx.Commit(); err != nil {
		return err
	}

	return nil
}

func parsePostgresVector(vecStr string) ([]float64, error) {
    trimmed := strings.Trim(vecStr, "[]")
    if trimmed == "" {
        return []float64{}, nil
    }
    parts := strings.Split(trimmed, ",")
    result := make([]float64, len(parts))

    for i, p := range parts {
        val, err := strconv.ParseFloat(p, 64)
        if err != nil {
            return nil, err
        }
        result[i] = val
    }
    return result, nil
}