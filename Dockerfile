# ==========================================
# Stage 1: Build Vue 3 + Vite Application
# ==========================================
FROM node:20-alpine AS builder

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy source code and build
COPY . .
RUN npm run build

# ==========================================
# Stage 2: Production Node Server Runtime
# ==========================================
FROM node:20-alpine

WORKDIR /app

# Copy package files & install production dependencies only
COPY package*.json ./
RUN npm ci --omit=dev

# Copy backend server code and built frontend dist
COPY server/ ./server/
COPY --from=builder /app/dist ./dist

# Create persistent data directory
RUN mkdir -p /app/server/data

# Environment
ENV NODE_ENV=production
ENV PORT=80
ENV DATA_DIR=/app/server/data

EXPOSE 80

CMD ["node", "server/server.js"]
