FROM node:20-alpine

WORKDIR /app
RUN corepack enable

COPY . .

# Verhindert, dass lokale dev-Settings (z.B. API_BASE_URL=http://localhost:3001)
# den Docker-Build beeinflussen.
RUN rm -f apps/web/.env.local

# Build-Args (werden via docker-compose.yml build.args gesetzt)
ARG API_BASE_URL=http://api:3001
ARG NEXT_PUBLIC_API_BASE_URL=http://localhost:3001

# Für Next build relevant (rewrites + NEXT_PUBLIC_* Inlining)
ENV API_BASE_URL=${API_BASE_URL}
ENV NEXT_PUBLIC_API_BASE_URL=${NEXT_PUBLIC_API_BASE_URL}

ENV CI=1

RUN pnpm install --frozen-lockfile --force
RUN pnpm --filter @webanwendung/shared build
RUN pnpm --filter @webanwendung/web build

EXPOSE 3000
CMD ["pnpm", "--filter", "@webanwendung/web", "start"]