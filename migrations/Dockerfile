FROM alpine:3.18

RUN apk add --no-cache curl bash postgresql-client

RUN curl -fsSL https://raw.githubusercontent.com/pressly/goose/master/install.sh | sh

WORKDIR /migrations

COPY *.sql .
COPY migrate.sh .

# Make the script executable
RUN chmod +x migrate.sh

# Run the script when container starts
CMD ["./migrate.sh"]