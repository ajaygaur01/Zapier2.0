FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL for Prisma detection during generate
RUN apt-get update -y && apt-get install -y openssl ca-certificates

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
FROM node:20-slim
WORKDIR /app

# Install OpenSSL for Prisma runtime
RUN apt-get update -y && apt-get install -y openssl ca-certificates

# 5. Copy root node_modules and packages (needed for @repo/db to work)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# 6. Copy the entire app (tsx runs source directly, no build step)
COPY --from=builder /app/apps/primarybackend ./apps/primarybackend

# 7. Run the app from inside its folder
WORKDIR /app/apps/primarybackend
EXPOSE 3000
CMD ["npm", "run", "dev"]
