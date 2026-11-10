FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
COPY packages/database/package.json packages/database/package.json
RUN npm ci
COPY . .
RUN npx prisma generate --schema packages/database/prisma/schema.prisma
RUN npm run build --workspace=@tourguard/api

FROM node:22-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
RUN addgroup -S tourguard && adduser -S tourguard -G tourguard
COPY --from=build --chown=tourguard:tourguard /app/node_modules ./node_modules
COPY --from=build --chown=tourguard:tourguard /app/apps/api/dist ./apps/api/dist
COPY --from=build --chown=tourguard:tourguard /app/packages/database/prisma ./packages/database/prisma
COPY --from=build --chown=tourguard:tourguard /app/packages/database/prisma7.config.ts ./packages/database/prisma7.config.ts
COPY --from=build --chown=tourguard:tourguard /app/package.json ./package.json
USER tourguard
EXPOSE 3001
CMD ["node", "apps/api/dist/main.js"]
