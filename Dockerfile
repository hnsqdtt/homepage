# 多阶段构建:standalone 输出,服务器永不构建(design/07)。
# 用 slim(glibc)保证 better-sqlite3 / sharp 的预编译产物直接可用。
FROM node:22-slim AS builder
WORKDIR /app

RUN npm i -g pnpm@11

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

# 版本号(健康探针返回)与站点地址(构建期预渲染用,运行时可被 .env 覆盖)
ARG GIT_SHA=dev
ARG SITE_URL=https://linlang.me
ENV APP_VERSION=$GIT_SHA \
    NEXT_PUBLIC_SITE_URL=$SITE_URL \
    DATA_DIR=/tmp/build-data \
    NEXT_TELEMETRY_DISABLED=1
# 先单进程跑迁移建好空库,再 build:next 并行 worker 各自打开 DB 时迁移已就位,
# 避免多进程同时 CREATE TABLE 的竞态
RUN mkdir -p /tmp/build-data && pnpm drizzle-kit migrate && pnpm build

FROM node:22-slim AS runner
ENV NODE_ENV=production \
    NEXT_TELEMETRY_DISABLED=1 \
    DATA_DIR=/data \
    PORT=3000 \
    HOSTNAME=0.0.0.0
WORKDIR /app

RUN groupadd -r app && useradd -r -g app -d /app app \
    && mkdir -p /data && chown app:app /data

COPY --from=builder --chown=app:app /app/.next/standalone ./
COPY --from=builder --chown=app:app /app/.next/static ./.next/static
COPY --from=builder --chown=app:app /app/public ./public
COPY --from=builder --chown=app:app /app/drizzle ./drizzle

ARG GIT_SHA=dev
ENV APP_VERSION=$GIT_SHA

USER app
EXPOSE 3000
CMD ["node", "server.js"]
