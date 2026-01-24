# check=skip=SecretsUsedInArgOrEnv
FROM node:20-alpine AS build

WORKDIR /app

ARG VITE_BASE_URL
ENV VITE_BASE_URL=${VITE_BASE_URL}


COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

FROM node:20-alpine AS production

WORKDIR /app

RUN npm install -g serve

COPY --from=build /app/out ./out

EXPOSE 3000

CMD ["serve", "-s", "out", "-l", "3000"]