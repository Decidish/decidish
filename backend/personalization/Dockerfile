FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . .

RUN CGO_ENABLED=0 GOOS=linux go build -o personalization_service ./cmd/personalization

FROM golang:1.25-alpine AS runner

WORKDIR /app

COPY --from=builder /app/personalization_service ./personalization_service

COPY --from=builder /app/db ./db

EXPOSE 8082

CMD ["./personalization_service"]