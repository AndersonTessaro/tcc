FROM node:22-alpine AS build
WORKDIR /build
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
# Same-origin API: nginx proxies /api, so the refresh cookie is first-party.
ENV EXPO_PUBLIC_API_URL=/api
RUN npx expo export -p web

FROM nginx:1.27-alpine
COPY nginx.conf.template /etc/nginx/templates/default.conf.template
COPY --from=build /build/dist /usr/share/nginx/html
EXPOSE 80
