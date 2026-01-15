FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml ./
COPY apps ./apps
COPY packages ./packages
COPY prisma ./prisma

RUN pnpm install
RUN pnpm --filter @webanwendung/shared build\n+RUN pnpm --filter @webanwendung/api build

EXPOSE 3001
CMD ["sh", "-c", "pnpm prisma migrate deploy && pnpm prisma db seed && node apps/api/dist/server.js"]
