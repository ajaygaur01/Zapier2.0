FROM node:20-alpine AS builder
WORKDIR /app

# 1. Copy root package.json and lockfile
COPY package.json package-lock.json* ./

# 2. Copy the specific app (notification-service)
COPY apps/services/notification-service ./apps/services/notification-service

# 3. Install dependencies
RUN npm install

# 4. Build the notification-service app
RUN cd apps/services/notification-service && npm run build

# --- Production Image ---
FROM node:20-alpine
WORKDIR /app

# 5. Copy root node_modules
COPY --from=builder /app/node_modules ./node_modules

# 6. Copy the built app
COPY --from=builder /app/apps/services/notification-service/package*.json ./apps/services/notification-service/
COPY --from=builder /app/apps/services/notification-service/dist ./apps/services/notification-service/dist

# 7. Run the app from inside its folder
WORKDIR /app/apps/services/notification-service
CMD ["npm", "run", "start"]
