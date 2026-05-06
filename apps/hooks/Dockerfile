FROM node:20-slim AS builder
WORKDIR /app

# Install OpenSSL for Prisma detection during generate
RUN apt-get update -y && apt-get install -y openssl ca-certificates

COPY package.json package-lock.json* ./
COPY packages ./packages
COPY apps/hooks ./apps/hooks

RUN npm install
RUN cd packages/db && npm run db:generate
RUN cd apps/hooks && npm run build

# --- Production Image ---
FROM node:20-slim
WORKDIR /app

# Install OpenSSL for Prisma runtime
RUN apt-get update -y && apt-get install -y openssl ca-certificates

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

COPY --from=builder /app/apps/hooks/package*.json ./apps/hooks/
COPY --from=builder /app/apps/hooks/dist ./apps/hooks/dist

WORKDIR /app/apps/hooks
EXPOSE 8000
CMD ["npm", "run", "start"]