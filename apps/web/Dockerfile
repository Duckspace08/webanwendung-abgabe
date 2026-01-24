FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY package.json pnpm-workspace.yaml ./
COPY tsconfig.base.json ./
COPY apps ./apps
COPY packages ./packages
COPY prisma ./prisma

RUN pnpm install
RUN pnpm --filter @webanwendung/shared build
RUN pnpm --filter @webanwendung/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@webanwendung/web", "start"]
