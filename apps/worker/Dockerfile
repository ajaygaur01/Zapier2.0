FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL for Prisma detection during generate
RUN apt-get update -y && apt-get install -y openssl ca-certificates

# 1. Copy root package.json and lockfile
COPY package.json package-lock.json* ./

# 2. Copy the shared packages (like DB) and the specific app
COPY packages ./packages
COPY apps/worker ./apps/worker

# 3. Install dependencies for the entire workspace
RUN npm install

# 4. Generate Prisma Client inside the db package
RUN cd packages/db && npm run db:generate

# --- Production Image ---
FROM node:20-slim
WORKDIR /app

# Install OpenSSL for Prisma runtime
RUN apt-get update -y && apt-get install -y openssl ca-certificates

# 5. Copy root node_modules and packages (needed for @repo/db to work)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# 6. Copy the entire app (because it uses tsx to run directly without a build step)
COPY --from=builder /app/apps/worker ./apps/worker

# 7. Run the app from inside its folder using the dev command defined in package.json
WORKDIR /app/apps/worker
CMD ["npm", "run", "dev"]
