FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm ci --omit=dev
COPY src ./src
RUN npm run build
USER non-root
CMD ["node", "dist/main.js"] 
