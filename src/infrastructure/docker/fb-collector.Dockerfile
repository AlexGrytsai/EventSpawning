FROM node:18-alpine
WORKDIR /app

COPY package*.json ./
COPY tsconfig.json ./

RUN npm ci --omit=dev

COPY prisma ./prisma
COPY src ./src

RUN npm run build

RUN adduser --disabled-password --gecos '' non-root
RUN chown -R non-root:non-root /app
RUN chmod -R 777 /app
USER non-root
