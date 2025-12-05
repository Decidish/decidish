package main

import (
	"database/sql"
	"log"
	"net"
	"personalization/config"
	"personalization/controller"
	"personalization/db/driver"
	"personalization/events"
	"personalization/middleware"
	"strconv"
	"time"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
	"github.com/segmentio/kafka-go"
)

func setupAppConfig() config.ApplicationConfig {
	appConfig := config.ApplicationConfig{}

	appConfig.LoadConfiguration()

	return appConfig
}

func connectDB(appConfig config.ApplicationConfig) *sql.DB {
	dbDriver := driver.DBDriver{
		MigrationDir:  "db/migrations",
		Name:          "postgres",
		ConnectionUrl: appConfig.DBConnectionUrl,
	}

	// Connect to the database
	return dbDriver.ConnectDB()
}

func CreateTopic(brokerAddr, topicName string) {
	// 1. Connect to the broker (control connection)
	conn, err := kafka.Dial("tcp", brokerAddr)
	if err != nil {
		log.Panicf("Failed to dial leader: %v", err)
		return
	}
	defer conn.Close()

	// 2. Get the controller (the node in charge of creating topics)
	controller, err := conn.Controller()
	if err != nil {
		log.Panicf("Failed to get controller: %v", err)
		return
	}

	// 3. Connect to the controller
	var controllerConn *kafka.Conn
	controllerConn, err = kafka.Dial("tcp", net.JoinHostPort(controller.Host, strconv.Itoa(controller.Port)))
	if err != nil {
		log.Panicf("Failed to dial controller: %v", err)
		return
	}
	defer controllerConn.Close()

	// 4. Create the topic configuration
	topicConfigs := []kafka.TopicConfig{
		{
			Topic:             topicName,
			NumPartitions:     3, // Run 3 ML consumers in parallel!
			ReplicationFactor: 1, // Single node cluster = 1 replica
		},
	}

	// 5. Execute creation
	err = controllerConn.CreateTopics(topicConfigs...)
	if err != nil {
		// Ignore error if topic already exists
		log.Printf("Topic creation warning (might already exist): %v", err)
	} else {
		log.Printf("Topic '%s' created successfully", topicName)
	}
}

func setupKafkaWriter(appConfig config.ApplicationConfig) *kafka.Writer {
	return &kafka.Writer{
		Addr:     kafka.TCP(appConfig.KafkaConnectionUrl),
		Topic:    "user-interactions",
		Balancer: &kafka.LeastBytes{}, // Distributes messages evenly across partitions

		Async: true,

		// Batching: Send when we have 100 messages OR every 500ms
		BatchSize:    100,
		BatchTimeout: 500 * time.Millisecond,

		// Reliability: Wait for at least one broker to ack the write
		RequiredAcks: kafka.RequireOne,
	}
}

func createUserActionMappings(r *gin.RouterGroup, kafkaWriter *kafka.Writer) {
	userEventProducer := events.UserInteractionProducer{
		Writer: kafkaWriter,
	}

	userActionController := controller.UserActionController{
		UserInteractionProducer: userEventProducer,
	}

	userActionController.AddMappings(r)
}

func main() {
	// Create application configuration from the env variables
	appConfig := setupAppConfig()

	dbDriver := driver.DBDriver{
		MigrationDir:  "db/migrations",
		Name:          "postgres",
		ConnectionUrl: appConfig.DBConnectionUrl,
	}

	// Connect to the database
	db := connectDB(appConfig)

	defer db.Close()

	// Run database migrations
	dbDriver.RunMigrations(db)

	CreateTopic(appConfig.KafkaConnectionUrl, "user-interactions")
	kafkaWriter := setupKafkaWriter(appConfig)

	r := gin.Default()

	// Cors Settings for Security
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"},
		AllowMethods:     []string{"PUT", "PATCH", "POST", "GET", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Authorization"},
		AllowCredentials: true,
		MaxAge:           12 * time.Hour,
	}))

	// Authentication needed
	protected := r.Group("/api/v1")

	protected.Use(middleware.AuthMiddleware(appConfig))
	{
		createUserActionMappings(protected, kafkaWriter)
	}

	if err := r.Run(":8082"); err != nil {
		log.Fatalf("failed to run server: %v", err)
	}
}
