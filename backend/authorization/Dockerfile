FROM golang:1.25-alpine AS builder

WORKDIR /app

COPY go.mod ./
COPY go.sum ./
RUN go mod download

COPY . .

RUN go build -o auth_service .


FROM golang:1.25-alpine AS runner

WORKDIR /app

COPY --from=builder /app/auth_service ./auth_service

COPY --from=builder /app/migrations ./migrations

EXPOSE 8082

CMD ["./auth_service"]