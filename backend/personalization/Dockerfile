FROM golang:1.25-alpine

WORKDIR /app

# Install CompileDaemon for hot-reloading in Go
RUN go install github.com/githubnemo/CompileDaemon@latest

COPY go.mod ./
# COPY go.sum ./ # Uncomment if you have this file
RUN go mod download

COPY . .

EXPOSE 8082

# Watch for changes and rerun the app
CMD ["CompileDaemon", "--build=go build -o main .", "--command=./main"]