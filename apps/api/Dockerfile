FROM node:20-bookworm-slim

WORKDIR /app
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      openssl \
      ca-certificates && \
    rm -rf /var/lib/apt/lists/*
RUN corepack enable

COPY package.json pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY prisma ./prisma

RUN pnpm install
RUN npx prisma generate --schema=prisma/schema.prisma
RUN pnpm --filter @webanwendung/shared build
RUN pnpm --filter @webanwendung/api build

EXPOSE 3001
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm prisma db seed && node apps/api/dist/server.js"]
