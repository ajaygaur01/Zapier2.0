FROM node:20-alpine AS builder
WORKDIR /app

# 1. Copy root package.json and lockfile
COPY package.json package-lock.json* ./

# 2. Copy the specific app (notification-service)
COPY apps/services/notification-service ./apps/services/notification-service

# 3. Install all workspace dependencies (hoists shared deps to root node_modules)
RUN npm install

# 4. Install the service's own deps directly so they are never missing
RUN cd apps/services/notification-service && npm install

# 5. Build the notification-service app
RUN cd apps/services/notification-service && npm run build

# --- Production Image ---
FROM node:20-alpine
WORKDIR /app

# 6. Copy root node_modules (hoisted packages)
COPY --from=builder /app/node_modules ./node_modules

# 7. Copy the built app + its own node_modules
COPY --from=builder /app/apps/services/notification-service/package*.json ./apps/services/notification-service/
COPY --from=builder /app/apps/services/notification-service/node_modules ./apps/services/notification-service/node_modules
COPY --from=builder /app/apps/services/notification-service/dist ./apps/services/notification-service/dist

# 8. Run the app from inside its folder
WORKDIR /app/apps/services/notification-service
CMD ["npm", "run", "start"]
