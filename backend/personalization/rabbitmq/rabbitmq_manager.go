package rabbitmq

import (
	"fmt"

	"github.com/streadway/amqp"
)

type RabbitMQManager struct {
	conn    *amqp.Connection
	channel *amqp.Channel
}

func NewRabbitMQManager(amqpURI string) (*RabbitMQManager, error) {
	// 1. Establish the persistent connection
	conn, err := amqp.Dial(amqpURI)
	if err != nil {
		return nil, fmt.Errorf("failed to connect to RabbitMQ: %w", err)
	}

	// 2. Open a channel on that connection
	ch, err := conn.Channel()
	if err != nil {
		// Must close the connection if channel opening fails
		conn.Close()
		return nil, fmt.Errorf("failed to open a channel: %w", err)
	}

	err = ch.ExchangeDeclare(
		"pipeline.commands", "direct", true, false, false, false, nil,
	)
	if err != nil {
		return nil, fmt.Errorf("failed to declare exchange: %w", err)
	}

	return &RabbitMQManager{
		conn:    conn,
		channel: ch,
	}, nil
}
