FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
COPY tsconfig.json ./
RUN npm ci --omit=dev
COPY prisma ./prisma
COPY src ./src
RUN npm run build
RUN npx prisma migrate deploy
USER non-root
CMD ["node", "dist/main.js"] 
