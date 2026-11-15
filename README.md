# Duhi ✨

Collection of bots for Interslavic communication.

## discord-spirit-latin

Turns Cyrillic text into Latin letters automatically.

**Environment Variables:**
```bash
export DISCORD_TOKEN=your_bot_token_here
export DISCORD_APPLICATION_ID=your_application_id_here
```

**Run:**

```bash
npx @interslavic/discord-spirit-latin
```

**Commands:**
- `/enable` - Enable transliteration in the current channel (requires Manage Channels permission)
- `/disable` - Disable transliteration in the current channel (requires Manage Channels permission)
- `/status` - Check if transliteration is enabled in the current channel

By default, the bot does not work in any channels. Use `/enable` in specific channels to enable transliteration in those channels. These commands require `Manage Channels` permissions.

## Deployment

Whatever is on `main` is what runs on the server.

1. Every push to `main` starts the [deploy workflow](.github/workflows/deploy.yml).
2. It builds one [Docker image](Dockerfile) for all bots from that commit. Type checks and tests run inside the build, so a failing test means no image.
3. The image goes to [ghcr.io/medzuslovjansky/duhi](https://github.com/medzuslovjansky/duhi/pkgs/container/duhi), and GitHub attests that its digest was built by this workflow from this commit.
4. The server pulls the image by that digest and runs what [compose.yml](compose.yml) lists.
5. The bot writes a link to its commit into its Discord profile. The workflow succeeds only after it reads that link back from Discord.

To check for yourself:

- The **Deployments** block of this repository shows which commit is in `production`.
- The bot's profile in Discord ("About Me") links to the same commit.
- The summary of the workflow run shows the image digest the server runs. This command confirms where that image came from:

```bash
gh attestation verify oci://ghcr.io/medzuslovjansky/duhi@sha256:... --repo medzuslovjansky/duhi
```

All of this shows what the workflow deployed. It cannot show what an administrator with SSH access to the server did by hand afterwards.

### Secrets

They live in the GitHub environment `production`, which only the workflow on `main` can read.

| Name | What it allows |
| --- | --- |
| `DEPLOY_HOST`, `DEPLOY_SSH_KEY`, `DEPLOY_KNOWN_HOSTS` | Logging in to the server as `deploy`, who can run any container there |
| `LATIN_DISCORD_TOKEN` | Acting as the `discord-spirit-latin` bot on Discord |
| `LATIN_DISCORD_APPLICATION_ID` | Nothing, it is public (a variable, not a secret) |

### Setting up a server

Done once. After that, deploying needs no login to the server.

1. Make a key for the workflow: `ssh-keygen -t ed25519 -N '' -C duhi-deploy -f duhi-deploy`
2. Create an Ubuntu server at Hetzner with [cloud-init.yml](cloud-init.yml) as its cloud config, putting the contents of `duhi-deploy.pub` in place of `DEPLOY_PUBLIC_KEY`.
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

## More bots coming soon...

That's it! 🎉
