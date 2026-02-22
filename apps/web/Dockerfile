FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY . .

RUN pnpm install --frozen-lockfile
RUN pnpm --filter @webanwendung/shared build
RUN pnpm --filter @webanwendung/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@webanwendung/web", "start"]