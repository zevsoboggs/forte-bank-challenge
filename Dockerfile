# Multi-stage build for Next.js application
FROM node:18-alpine AS base

# Install dependencies only when needed
FROM base AS deps
RUN apk add --no-cache libc6-compat openssl openssl-dev
WORKDIR /app

COPY package.json package-lock.json* ./
RUN npm install --legacy-peer-deps --ignore-scripts

# Rebuild the source code only when needed
FROM base AS builder
RUN apk add --no-cache openssl openssl-dev
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

# Build args for Next.js build
ARG OPENAI_API_KEY=""
ARG DATABASE_URL=""
ENV OPENAI_API_KEY=$OPENAI_API_KEY
ENV DATABASE_URL=$DATABASE_URL

# Generate Prisma Client
RUN npx prisma generate

# Build Next.js
RUN npm run build

# Production image, copy all the files and run next
FROM base AS runner
WORKDIR /app

# Install OpenSSL for Prisma
RUN apk add --no-cache openssl libc6-compat

ENV NODE_ENV production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static
COPY --from=builder /app/node_modules/.prisma ./node_modules/.prisma
COPY --from=builder /app/node_modules/@prisma ./node_modules/@prisma
COPY --from=builder /app/prisma ./prisma
# Copy source files for next-swagger-doc (needs to read JSDoc comments at runtime)
COPY --from=builder /app/src/app/api ./src/app/api

USER nextjs

EXPOSE 3000

ENV PORT 3000
# Force IPv4 for DNS resolution (fix axios ::1 issue)
ENV NODE_OPTIONS="--dns-result-order=ipv4first"

CMD ["node", "server.js"]
