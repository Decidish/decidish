package kafka

import (
	"context"
	"sync"
	"time"

	"github.com/segmentio/kafka-go"
)

// KafkaClient is a small helper around segmentio/kafka-go to produce and consume messages.
type KafkaClient struct {
	brokers []string
	dialer  *kafka.Dialer

	mu      sync.Mutex
	writers map[string]*kafka.Writer
}

// NewClient creates a KafkaClient. Pass the Kafka broker addresses (not Zookeeper).
func NewClient(brokers []string) *KafkaClient {
	return &KafkaClient{
		brokers: brokers,
		dialer: &kafka.Dialer{
			Timeout:   10 * time.Second,
			DualStack: true,
		},
		writers: make(map[string]*kafka.Writer),
	}
}

// Close closes any pooled writers. Call when shutting down your application.
func (c *KafkaClient) Close() error {
	c.mu.Lock()
	defer c.mu.Unlock()

	var firstErr error
	for t, w := range c.writers {
		if err := w.Close(); err != nil && firstErr == nil {
			firstErr = err
		}
		delete(c.writers, t)
	}
	return firstErr
}

// Produce sends a single message to the given topic. key may be nil.
func (c *KafkaClient) Produce(ctx context.Context, topic string, key, value []byte) error {
	w := c.writerFor(topic)
	msg := kafka.Message{
		Key:   key,
		Value: value,
		Time:  time.Now(),
	}
	return w.WriteMessages(ctx, msg)
}

// Consume starts consuming messages from topic as part of the given groupID.
// handler is called for each message (key may be nil). Cancel ctx to stop consumption.
// This function blocks until ctx is canceled or an error occurs.
func (c *KafkaClient) Consume(ctx context.Context, topic, groupID string, handler func(key, value []byte) error) error {
	reader := kafka.NewReader(kafka.ReaderConfig{
		Brokers:  c.brokers,
		GroupID:  groupID,
		Topic:    topic,
		MinBytes: 10e3, // 10KB
		MaxBytes: 10e6, // 10MB
		Dialer:   c.dialer,
	})
	defer reader.Close()

	for {
		m, err := reader.ReadMessage(ctx)
		if err != nil {
			// context cancellation will surface here as ctx.Err() wrapped by kafka-go
			return err
		}

		if err := handler(m.Key, m.Value); err != nil {
			// handler returning an error will stop consumption
			return err
		}
		// ReadMessage auto-commits offsets for group consumers. If you need manual control,
		// use FetchMessage/CommitMessages instead.
	}
}

// writerFor returns or creates a cached writer for the requested topic.
func (c *KafkaClient) writerFor(topic string) *kafka.Writer {
	c.mu.Lock()
	defer c.mu.Unlock()

	if w, ok := c.writers[topic]; ok {
		return w
	}

	w := kafka.NewWriter(kafka.WriterConfig{
		Brokers:  c.brokers,
		Topic:    topic,
		Balancer: &kafka.Hash{}, // use key hashing when key is set
	})
	c.writers[topic] = w
	return w
}