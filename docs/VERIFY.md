# Verification

Two separate questions: **whose bot is this**, and **what code does it run**.

## Whose bot

Every Discord bot has a user ID assigned by Discord, and no other bot can have the same one.
The official IDs are in the [table of bots](../README.md#bots).
To see a bot's ID in Discord: Settings → Advanced → Developer Mode, then right-click the bot → Copy User ID.
The buttons in that table always add the official bot.
Check the ID first: the code is public, so a copy of a bot can show the same commit as the official one.

## What code it runs

All bots are built and deployed together: whatever is on `main` is what runs on the server.

1. Every push to `main` starts the [deploy workflow](../.github/workflows/deploy.yml).
2. It builds one [Docker image](../Dockerfile) for all bots from that commit. Type checks and tests run inside the build, so a failing test means no image.
3. The image goes to [ghcr.io/medzuslovjansky/duhi](https://github.com/medzuslovjansky/duhi/pkgs/container/duhi), and GitHub attests that its digest was built by this workflow from this commit.
4. The server pulls the image by that digest and runs one container per bot, as [compose.yml](../compose.yml) lists.
5. Each bot writes a link to its commit into its Discord profile. The workflow succeeds only after it reads that link back from Discord.

To check for yourself:

- The **Deployments** block of this repository shows which commit is in `production`.
- A bot's profile in Discord ("About Me") links to the same commit. Mentioning the bot with no other text answers with the same commit.
- The summary of the workflow run shows the image digest the server runs. This command confirms where that image came from:

```bash
gh attestation verify oci://ghcr.io/medzuslovjansky/duhi@sha256:... --repo medzuslovjansky/duhi
```

## Where it runs

The bots run on [Hetzner Cloud](https://www.hetzner.com/cloud).
Members of the [Committee of the Interslavic Language](https://interslavicforum.org/about-interslavic/) have access to the server
through the project's 1Password ([Teams for Open Source](https://github.com/medzuslovjansky/1password-teams-open-source)).
