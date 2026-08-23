# ==========================================
# Stage 1: Build Vue 3 + Vite Application
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package descriptors
COPY package*.json ./

# Install all dependencies
RUN npm ci

# Copy source code and config
COPY . .

# Build production bundle with Vite
RUN npm run build

# ==========================================
# Stage 2: Production Nginx Server
# ==========================================
FROM nginx:alpine

# Copy custom nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# Copy compiled assets from builder
COPY --from=builder /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
