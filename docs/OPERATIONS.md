# Operations

For the people who hold access to the server. Deployment itself is automatic, see [VERIFY.md](VERIFY.md).

## Secrets

They live in the GitHub environment `production`, which only the workflow on `main` can read.

| Name | What it allows |
| --- | --- |
| `DEPLOY_HOST`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS` | Logging in to the server as `deploy`, who can run any container there |
| `LATIN_DISCORD_TOKEN` | Acting as the `discord-spirit-latin` bot on Discord |
| `LATIN_DISCORD_APPLICATION_ID` | Nothing, it is public (a variable, not a secret) |

On the server the `LATIN_` prefix is dropped: [compose.yml](../compose.yml) passes them to the bot as `DISCORD_TOKEN` and `DISCORD_APPLICATION_ID`. The prefix keeps the secrets of several bots apart.

## Setting up a server

Done once. After that, deploying needs no login to the server.

1. Make a key for the workflow: `ssh-keygen -t ed25519 -N '' -C duhi-deploy -f duhi-deploy`
2. Create an Ubuntu server at Hetzner with [cloud-init.yml](../cloud-init.yml) as its cloud config, putting the contents of `duhi-deploy.pub` in place of `DEPLOY_PUBLIC_KEY`.
3. In the repository settings, create the environment `production` and limit its deployment branches to `main`. Then fill it and delete the key:

```bash
gh secret set DEPLOY_SSH_KEY --env production < duhi-deploy
gh secret set DEPLOY_HOST --env production --body "$SERVER_ADDRESS"
ssh-keyscan -t ed25519 "$SERVER_ADDRESS" | gh secret set DEPLOY_KNOWN_HOSTS --env production
gh secret set LATIN_DISCORD_TOKEN --env production
gh variable set LATIN_DISCORD_APPLICATION_ID --env production --body "$APPLICATION_ID"
rm duhi-deploy duhi-deploy.pub
```

4. The server pulls the image without credentials, so the `duhi` package on GHCR must be public. If the first deploy fails to pull it, make the package public in its settings and re-run the deploy job.
