# The relay as a container, for hosts with a free container tier. Build it from the repo root, since
# it bundles src/core/:
#   docker build -f relay/Dockerfile -t dashboard-relay .
#   docker run -p 8787:8787 -e RELAY_TOKEN=… -e RELAY_ALLOWED_ORIGINS=https://… dashboard-relay

FROM node:24.22.1-alpine AS build
RUN npm install --global pnpm@12.15.0
WORKDIR /repo
COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
COPY relay relay
# The relay alone with its build tools, as the lockfile has them; none need install scripts.
RUN pnpm --filter dashboard-relay deploy --ignore-scripts /build/relay
# It imports src/core/ as ../../src/core and bundles it.
COPY src/core /build/src/core
RUN cd /build/relay && pnpm build && cp -r dist /repo/relay/dist \
  && cd /repo && pnpm --filter dashboard-relay deploy --prod --ignore-scripts /app

FROM node:24.22.1-alpine
WORKDIR /app
ENV NODE_ENV=production RELAY_HOST=0.0.0.0 RELAY_PORT=8787
COPY --from=build /app .
USER node
EXPOSE 8787
CMD ["node", "dist/server.mjs"]
