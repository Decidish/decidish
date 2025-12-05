package events

import (
	"context"
	"encoding/json"
	"log"

	"github.com/segmentio/kafka-go"
)

type UserInteractionProducer struct {
	Writer *kafka.Writer
}

type UserInteraction struct {
	UserID    string `json:"user_id,omitempty"`
	RecipeID  string `json:"recipe_id"`
	Action    string `json:"action"`
	Timestamp int64  `json:"timestamp"`
}

// PublishUserInteractionEvent Publishes the given userInteraction event
func (producer UserInteractionProducer) PublishUserInteractionEvent(userInteraction UserInteraction) error {
	payload, err := json.Marshal(userInteraction)

	if err != nil {
		log.Fatalf("failed to marshal interaction: %v", err)
		return err
	}

	err = producer.Writer.WriteMessages(context.Background(), kafka.Message{
		Key:   []byte(userInteraction.UserID),
		Value: payload,
	})

	return err
}
