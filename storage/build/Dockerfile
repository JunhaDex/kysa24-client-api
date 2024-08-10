# build stage
FROM node:20-alpine as build-stage
WORKDIR /usr/src/app
RUN apk add --update --no-cache build-base python3
COPY . .
RUN yarn && yarn build

# deploiy stage
FROM node:20-alpine as deploy-stage
WORKDIR /usr/src/app
RUN npm install -g yarn --force
COPY --from=build-stage /usr/src/app/dist ./dist
COPY --from=build-stage /usr/src/app/secret ./secret
COPY --from=build-stage /usr/src/app/.env .
COPY --from=build-stage /usr/src/app/package.json .
COPY --from=build-stage /usr/src/app/yarn.lock .
RUN yarn install --production --ignore-engines
CMD node dist/main.js
EXPOSE 3001
