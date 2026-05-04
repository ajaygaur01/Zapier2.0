FROM node:20-alpine AS builder
WORKDIR /app

# 1. Copy root package.json and lockfile
COPY package.json package-lock.json* ./

# 2. Copy the shared packages (like DB) and the specific app
COPY packages ./packages
COPY apps/processor ./apps/processor

# 3. Install dependencies for the entire workspace
RUN npm install

# 4. Generate Prisma Client inside the db package
RUN cd packages/db && npm run db:generate

# 5. Build the processor app
RUN cd apps/processor && npm run build

# --- Production Image ---
FROM node:20-alpine
WORKDIR /app

# 6. Copy root node_modules and packages (needed for @repo/db to work)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# 7. Copy the built app
COPY --from=builder /app/apps/processor/package*.json ./apps/processor/
COPY --from=builder /app/apps/processor/dist ./apps/processor/dist

# 8. Run the app from inside its folder
WORKDIR /app/apps/processor
CMD ["npm", "run", "start"]
