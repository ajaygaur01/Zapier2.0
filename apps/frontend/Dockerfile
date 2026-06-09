FROM node:20-alpine AS builder
WORKDIR /app

# Copy root package.json (for workspace context) and the frontend's package.json
COPY package.json package-lock.json* ./
COPY apps/frontend/package*.json ./apps/frontend/

# Install all dependencies (including devDependencies) to build the app
RUN npm install --workspace=apps/frontend

# Copy frontend source code
COPY apps/frontend ./apps/frontend

# Build Next.js
RUN cd apps/frontend && npm run build

# --- Production Image ---
FROM node:20-alpine
WORKDIR /app

# Copy package definitions for production install
COPY package.json package-lock.json* ./
COPY apps/frontend/package*.json ./apps/frontend/

# Install only production dependencies (no devDependencies like Tailwind/TypeScript)
RUN npm install --workspace=apps/frontend --omit=dev

# Copy compiled Next.js build and public assets from the builder stage
COPY --from=builder /app/apps/frontend/.next ./apps/frontend/.next
COPY --from=builder /app/apps/frontend/public ./apps/frontend/public

EXPOSE 3001
ENV PORT=3001
CMD ["npm", "run", "start", "--workspace=apps/frontend"]