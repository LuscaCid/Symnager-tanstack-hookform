# Frontend web do Symnager: build do Vite servido por nginx (com proxy /api para a API).
FROM node:22-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
# só o necessário para o build web (sem baixar o binário do Electron)
ENV ELECTRON_SKIP_BINARY_DOWNLOAD=1
RUN npm ci --no-audit --no-fund
COPY . .
ARG VITE_API_URL=/api
ENV VITE_API_URL=$VITE_API_URL
RUN npx tsc --noEmit -p . && npx vite build

FROM nginx:1.27-alpine
# usuário não-root e porta sem privilégio
RUN rm /etc/nginx/conf.d/default.conf \
 && mkdir -p /var/cache/nginx /run/nginx \
 && chown -R nginx:nginx /var/cache/nginx /run/nginx /usr/share/nginx/html
COPY docker/nginx.conf /etc/nginx/nginx.conf
COPY docker/security-headers.conf /etc/nginx/security-headers.conf
COPY docker/proxy_params_symnager /etc/nginx/proxy_params_symnager
COPY --from=build --chown=nginx:nginx /app/dist /usr/share/nginx/html
USER nginx
EXPOSE 8080
HEALTHCHECK --interval=30s --timeout=3s --retries=3 CMD wget -qO- http://127.0.0.1:8080/healthz || exit 1
