FROM node:20-alpine AS builder

WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY tsconfig.json ./
COPY src ./src
COPY examples ./examples
RUN npm run build

FROM node:20-alpine

WORKDIR /app
ENV NODE_ENV=production
ENV HOP_VERIFY_API_HOST=0.0.0.0
ENV HOP_VERIFY_API_PORT=4411

COPY --from=builder /app/dist ./dist

EXPOSE 4411
CMD ["node", "dist/src/api/verifier.js"]
