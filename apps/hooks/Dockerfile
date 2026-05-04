FROM node:20-alpine AS builder
WORKDIR /app
COPY package.json package-lock.json* ./
COPY packages ./packages
COPY apps/hooks ./apps/hooks
RUN npm install
RUN cd packages/db && npm run db:generate
RUN cd apps/hooks && npm run build
FROM node:20-alpine
WORKDIR /app

# 6. Copy root node_modules and packages (needed for @repo/db to work)
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/packages ./packages

# 7. Copy the built hooks app
COPY --from=builder /app/apps/hooks/package*.json ./apps/hooks/
COPY --from=builder /app/apps/hooks/dist ./apps/hooks/dist

# 8. Run the app from inside its folder
WORKDIR /app/apps/hooks
EXPOSE 8000
CMD ["npm", "run", "start"]