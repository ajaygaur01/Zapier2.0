FROM node:20-alpine AS builder
WORKDIR /app

# 1. Copy root package.json and lockfile
COPY package.json package-lock.json* ./

# 2. Copy the shared packages (like DB) and the specific app
COPY packages ./packages
COPY apps/primarybackend ./apps/primarybackend

# 3. Install dependencies for the entire workspace
RUN npm install

# 4. Generate Prisma Client inside the db package
RUN cd packages/db && npm run db:generate

# --- Production Image ---
FROM node:20-alpine
WORKDIR /app

# 5. Copy root node_modules and packages (needed for @repo/db to work)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# 6. Copy the entire app (because it uses tsx to run directly without a build step)
COPY --from=builder /app/apps/primarybackend ./apps/primarybackend

# 7. Run the app from inside its folder using the dev command defined in package.json
WORKDIR /app/apps/primarybackend
EXPOSE 3000
CMD ["npm", "run", "dev"]
