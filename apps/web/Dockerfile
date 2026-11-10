FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
RUN npm ci
COPY . .
RUN npm run build --workspace=@tourguard/web

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S tourguard && adduser -S tourguard -G tourguard
COPY --from=build --chown=tourguard:tourguard /app/node_modules ./node_modules
COPY --from=build --chown=tourguard:tourguard /app/apps/web/.next ./apps/web/.next
COPY --from=build --chown=tourguard:tourguard /app/apps/web/package.json ./apps/web/package.json
USER tourguard
EXPOSE 3000
CMD ["npm", "run", "start", "--workspace=@tourguard/web", "--", "-p", "3000"]
