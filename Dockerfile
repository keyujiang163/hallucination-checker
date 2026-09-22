# Render / Railway / Fly.io one-click deploy. Avoids mainland China DNS pollution.
FROM node:20-alpine

WORKDIR /app

# Install deps first for better layer caching
COPY package*.json ./
RUN npm ci --omit=dev

# App source
COPY server.js searchProviders.js ./
COPY public ./public
COPY .env.example ./

EXPOSE 3737

HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD wget -qO- http://localhost:3737/api/health || exit 1

CMD ["node", "server.js"]