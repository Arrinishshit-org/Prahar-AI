FROM node:18-slim AS builder

WORKDIR /app

COPY package.json ./
COPY backend/package.json backend/
COPY frontend_new/package.json frontend_new/

RUN npm install

COPY frontend_new/ frontend_new/

RUN npm run build -w frontend_new

# --- Nginx stage ---
FROM nginx:alpine

COPY --from=builder /app/frontend_new/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]