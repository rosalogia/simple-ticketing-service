FROM node:22-alpine AS build

WORKDIR /app
COPY package.json package-lock.json* ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf.template /etc/nginx/templates/default.conf.template

# nginx:alpine auto-runs envsubst on /etc/nginx/templates/*.template
# Required env vars: PORT (Railway sets this), BACKEND_HOST (e.g. backend:8000)
ENV PORT=80
ENV BACKEND_HOST=backend:8000
EXPOSE 80
