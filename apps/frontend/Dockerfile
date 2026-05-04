FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package.json (for workspace context) and the frontend's package.json
COPY package.json package-lock.json* ./
COPY apps/frontend/package*.json ./apps/frontend/

# Install dependencies (scoped to the frontend workspace)
RUN npm install --workspace=apps/frontend

# Copy frontend source code
COPY apps/frontend ./apps/frontend

# Build Next.js from inside the frontend folder
RUN cd apps/frontend && npm run build

# --- Production Image ---
FROM node:20-alpine
WORKDIR /app/apps/frontend

# Copy only what's needed to run in production
COPY --from=builder /app/apps/frontend/package*.json ./
COPY --from=builder /app/apps/frontend/node_modules ./node_modules
COPY --from=builder /app/apps/frontend/.next ./.next
COPY --from=builder /app/apps/frontend/public ./public

EXPOSE 3001
CMD ["npm", "run", "start"]