FROM node:18-alpine AS builder

WORKDIR /app

COPY package.json package-lock.json* ./
COPY backend/package.json backend/
COPY frontend_new/package.json frontend_new/

RUN npm ci --ignore-scripts 2>/dev/null || npm install --ignore-scripts

COPY frontend_new/ frontend_new/

RUN npm run build -w frontend_new

# --- Nginx stage ---
FROM nginx:alpine

COPY --from=builder /app/frontend_new/dist /usr/share/nginx/html
COPY deploy/nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
