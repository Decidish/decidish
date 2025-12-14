package rabbitmq

import (
	"context"
	"log"
	"sync"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type RabbitMQPublisher struct {
	Ch *amqp.Channel
	Mu sync.Mutex
}

func NewRabbitMQPublisher(conn *amqp.Connection) *RabbitMQPublisher {
	ch, err := conn.Channel()
	if err != nil {
		log.Panicf("Failed to open channel: %s", err)
	}

	_, err = ch.QueueDeclare(
		"onboarding_publisher",
		true,
		false,
		false,
		false,
		nil,
	)
	if err != nil {
		log.Panicf("Failed to declare queue: %s", err)
	}

	return &RabbitMQPublisher{
		Ch: ch,
		Mu: sync.Mutex{},
	}
}

func (publisher *RabbitMQPublisher) PublishEvent(queueName string, exchange string, eventBody any) error {
	return publisher.Ch.PublishWithContext(
		context.Background(),
		exchange,
		queueName,
		false,
		false,
		amqp.Publishing{
			ContentType:   "application/json",
			DeliveryMode:  0,
			Priority:      0,
			CorrelationId: "",
			ReplyTo:       "",
			Timestamp:     time.Now(),
			UserId:        "",
			AppId:         "",
			Body:          nil,
		},
	)
}
