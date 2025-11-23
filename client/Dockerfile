FROM node:22-alpine

WORKDIR /app
# Install Expo CLI global
RUN npm install -g expo-cli

COPY package*.json ./
RUN npm install

COPY . .

# Expose Metro Bundler port
EXPOSE 8081

# Run in web mode, listening on all interfaces
CMD ["npx", "expo", "start", "--web", "--host", "lan"]