# Contributing

Each bot is a package in [packages/](packages). The repository uses Yarn 4 and the Node version in [.nvmrc](.nvmrc).

```bash
yarn install
yarn test     # all packages
yarn build    # type checks and bundles
```

## Running a bot locally

A local run needs your own Discord application, not the production one:
create it at <https://discord.com/developers/applications>, add it to a test server, then

```bash
cd packages/discord-spirit-latin
cp env.example .env   # fill in DISCORD_TOKEN and DISCORD_APPLICATION_ID
yarn dev
```

## Adding a bot

Add a package under `packages/` and a service for it in [compose.yml](compose.yml); its secrets go to the `production` environment as described in [docs/OPERATIONS.md](docs/OPERATIONS.md).
