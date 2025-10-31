# Etapa 1: Build de la aplicación Vue.js
FROM node:22-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY . .
RUN npm run build

# Etapa 2: Servir los archivos estáticos con Nginx
FROM nginx:stable-alpine

# Copiamos los archivos compilados de la etapa de build
COPY --from=build /app/dist /usr/share/nginx/html

# Copiamos una configuración personalizada de Nginx si es necesario (opcional)
# COPY nginx.conf /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]