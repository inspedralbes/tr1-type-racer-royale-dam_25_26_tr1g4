# Stage 1: Build the Vue application for production
FROM node:20-alpine as builder

WORKDIR /app

# Argumentos de build para las variables de entorno de Vite
ARG VITE_NODE_ENV
ARG VITE_API_URL
ARG VITE_SOCKET_URL

# Asigna los args a las variables de entorno para que `npm run build` las use
ENV VITE_NODE_ENV=$VITE_NODE_ENV
ENV VITE_API_URL=$VITE_API_URL
ENV VITE_SOCKET_URL=$VITE_SOCKET_URL

COPY package*.json ./
RUN npm install --omit=dev
COPY . .
RUN npm run build

# Stage 2: Serve the production build with Nginx
FROM nginx:stable-alpine as production

# ¡IMPORTANTE! Eliminamos la copia de `nginx.conf` de aquí.
# Se montará a través de un volumen en docker-compose.yml
# COPY nginx.conf /etc/nginx/conf.d/default.conf

COPY --from=builder /app/dist /usr/share/nginx/html
EXPOSE 80
EXPOSE 443 
CMD ["nginx", "-g", "daemon off;"]

# Stage 3: Development environment setup
FROM node:20-alpine as development
WORKDIR /app
COPY package*.json ./
RUN npm install
EXPOSE 5173
CMD ["npm", "run", "dev"]