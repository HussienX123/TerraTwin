# Multi-stage Dockerfile for TerraTwin (Dokploy / Coolify / PaaS root context)
# Stage 1: Build static assets
FROM node:20-alpine AS builder
WORKDIR /app

# Copy package manifests from terra_twin_web
COPY terra_twin_web/package*.json ./
RUN npm ci

# Copy web source and build
COPY terra_twin_web/ ./
RUN npm run build

# Stage 2: Production Nginx Server
FROM nginx:alpine
WORKDIR /usr/share/nginx/html

RUN rm -rf ./*
COPY --from=builder /app/dist /usr/share/nginx/html
COPY terra_twin_web/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
