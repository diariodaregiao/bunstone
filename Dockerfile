FROM oven/bun:latest AS builder

WORKDIR /app

COPY package.json bun.lockb* ./
COPY docs ./docs
COPY examples ./examples
COPY vite.config.ts ./
COPY tsconfig.json ./

RUN bun install --frozen-lockfile && \
    bun run docs:build

FROM oven/bun:latest

WORKDIR /app

COPY package.json ./

COPY vite.config.ts ./

COPY --from=builder /app/docs/.vitepress/dist ./dist

RUN bun add vite

EXPOSE 3000

CMD ["bun", "run", "vite", "preview", "--host", "0.0.0.0", "--port", "3000"]