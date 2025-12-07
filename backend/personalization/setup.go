package main

import (
	"database/sql"
	"log"
	"net"
	"personalization/config"
	"personalization/controller"
	"personalization/db/driver"
	"personalization/events"
	"personalization/repository"
	"personalization/service"
	"strconv"
	"time"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
	"github.com/segmentio/kafka-go"
)

func setupAppConfig() config.ApplicationConfig {
	err := godotenv.Load()
	if err != nil {
		log.Println("Note: Could not find .env file, relying on shell environment.")
	}

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
	conn, err := kafka.Dial("tcp", brokerAddr)
	if err != nil {
		log.Panicf("Failed to dial leader: %v", err)
		return
	}
	defer conn.Close()

	controller, err := conn.Controller()
	if err != nil {
		log.Panicf("Failed to get controller: %v", err)
		return
	}

	var controllerConn *kafka.Conn
	controllerConn, err = kafka.Dial("tcp", net.JoinHostPort(controller.Host, strconv.Itoa(controller.Port)))
	if err != nil {
		log.Panicf("Failed to dial controller: %v", err)
		return
	}
	defer controllerConn.Close()

	topicConfigs := []kafka.TopicConfig{
		{
			Topic:             topicName,
			NumPartitions:     3, // Run 3 ML consumers in parallel!
			ReplicationFactor: 1, // Single node cluster = 1 replica
		},
	}

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

func createRecommendRecipesMappings(r *gin.RouterGroup, db *sql.DB) {
	recipeRepo := repository.RecommenderRepository{
		Db: db,
	}

	recipeService := service.RecommenderService{
		RecommenderRepository: recipeRepo,
	}

	recipeController := controller.RecommenderController{
		RecommenderService: recipeService,
	}

	recipeController.AddMappings(r)
}
