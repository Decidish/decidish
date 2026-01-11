FROM node:25-alpine AS builder

WORKDIR /app

# Install dependencies
COPY package*.json ./
RUN npm ci

# Copy source and build
COPY . .
# Ensure you are building for web
RUN npx expo export -p web

FROM node:25-alpine

WORKDIR /app

# Install the 'serve' package globally
RUN npm install -g serve

# Copy ONLY the build output (dist) from the builder stage
COPY --from=builder /app/dist ./dist

# Expose the port serve runs on (default 3000)
EXPOSE 3000

# Start serve
# -s: Single Page Application mode (redirects 404s to index.html)
# dist: The folder to serve
CMD ["serve", "-s", "dist", "-l", "3000"]