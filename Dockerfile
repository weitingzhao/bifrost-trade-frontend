# Build stage
FROM node:20-slim AS builder

WORKDIR /app

# package-lock.json must include Linux optional deps (esbuild, @emnapi/*) for Docker.
# Refresh after dependency changes: npm run sync:docker-lock
COPY package.json package-lock.json* ./
RUN npm ci

COPY . .
# Same-origin API bases for infra nginx (/api/{domain}/). See .env.production.example.
RUN test -f .env.production || cp .env.production.example .env.production
RUN npm run build

# Production stage — serve via nginx
FROM nginx:alpine

COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
