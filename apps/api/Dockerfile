FROM node:20-bookworm-slim

WORKDIR /app
RUN apt-get update && \
    apt-get install -y --no-install-recommends \
      openssl \
      ca-certificates && \
    rm -rf /var/lib/apt/lists/*
RUN corepack enable

# Robuster: komplettes Repo (mit .dockerignore klein gehalten)
COPY . .

# Reproduzierbar
ENV CI=1
RUN pnpm install --frozen-lockfile --force

# Prisma + Builds
RUN pnpm prisma generate --schema=prisma/schema.prisma
RUN pnpm --filter @webanwendung/shared build
RUN pnpm --filter @webanwendung/api build

EXPOSE 3001
CMD ["node", "apps/api/dist/server.js"]