# Etapa de construcción
FROM node:18-alpine AS build

WORKDIR /usr/src/app

COPY package*.json ./
RUN npm install

COPY . .

# Etapa de producción
FROM node:22-alpine

WORKDIR /usr/src/app

COPY --from=build /usr/src/app .

EXPOSE 7001
CMD [ "node", "index.js" ]