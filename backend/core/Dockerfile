FROM eclipse-temurin:21-jdk-alpine

WORKDIR /app

COPY gradle ./gradle
COPY gradlew build.gradle settings.gradle ./

RUN chmod +x gradlew

#    '--no-daemon' ensures Gradle doesn't linger in the build layer
RUN ./gradlew dependencies --no-daemon

COPY src ./src

EXPOSE 8080

#    -t (--continuous) tells Gradle to watch for source changes and restart the task
CMD ["./gradlew", "bootRun", "-t", "--no-daemon"]