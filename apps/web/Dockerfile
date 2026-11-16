FROM node:24.19.0-alpine AS build
RUN corepack enable
WORKDIR /workspace
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY apps/web/package.json apps/web/package.json
COPY modules/phantom-ledger/web/package.json modules/phantom-ledger/web/package.json
COPY packages/p5r-ds/package.json packages/p5r-ds/package.json
RUN pnpm install --frozen-lockfile
COPY tsconfig.base.json vitest.setup.ts ./
COPY apps/web apps/web
COPY modules modules
COPY packages packages
RUN pnpm --filter @superapp/web build

FROM nginxinc/nginx-unprivileged:1.30.6-alpine
ENV NGINX_ENVSUBST_FILTER=BACKEND_URL
COPY apps/web/nginx/default.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /workspace/apps/web/dist /usr/share/nginx/html
