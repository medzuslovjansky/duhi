# One image for all bots: the repository at one commit, with its locked dependencies.
# The build fails unless type checks and tests pass, so an image that exists is a tested one.

FROM node:26-slim AS build
WORKDIR /app
COPY . .
RUN ln -s /app/.yarn/releases/yarn-*.cjs /usr/local/bin/yarn
RUN yarn install --immutable
RUN yarn run build
RUN yarn run test
RUN yarn workspaces focus --all --production

FROM node:26-slim
COPY --from=build /app /app
# Bots keep their state in the working directory; compose.yml mounts a volume here.
RUN install -d -o node -g node /data
WORKDIR /data
USER node

# The commit this image was built from (and its time, Unix seconds), and the CI run that built and deployed it.
# Each bot publishes the commit in its Discord profile.
ARG GIT_SHA
ARG GIT_COMMIT_TIME
ARG CI_RUN_URL
ENV GIT_SHA=$GIT_SHA GIT_COMMIT_TIME=$GIT_COMMIT_TIME CI_RUN_URL=$CI_RUN_URL
LABEL org.opencontainers.image.source=https://github.com/medzuslovjansky/duhi
LABEL org.opencontainers.image.revision=$GIT_SHA
