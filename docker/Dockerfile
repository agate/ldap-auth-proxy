FROM node:lts-alpine

WORKDIR /app
COPY package* .npmrc /app/
RUN apk add python make --no-cache && \
    npm install

COPY src /app/src/
CMD ["npm", "start"]
