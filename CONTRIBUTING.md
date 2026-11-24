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
cd packages/<bot>
cp env.example .env   # fill in DISCORD_TOKEN and DISCORD_APPLICATION_ID
yarn dev
```

## Adding a bot

1. A package under `packages/`, with `env.example` and tests.
2. Like the existing bots, it writes the running commit into its Discord profile, where the deploy workflow reads it back, so it can be [verified](docs/VERIFY.md).
3. A service for it in [compose.yml](compose.yml) with its own prefix, its secrets in `production` ([docs/OPERATIONS.md](docs/OPERATIONS.md)), and the same prefix in the [deploy workflow](.github/workflows/deploy.yml): its `env` and the step that reads the commit back from Discord.
4. A row in the README [table of bots](README.md#bots) and, if it has commands, a `###` section under Commands.
