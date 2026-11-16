# Verification

Two separate questions: **whose bot is this**, and **what code does it run**.

## Whose bot

A Discord bot's user ID equals its application ID, and Discord does not let anyone else take it.
The official `discord-spirit-latin` is `1430518339821895750`.
Compare it before trusting anything the bot itself shows: its code is public, so a copy can show the same commit.

## What code it runs

Whatever is on `main` is what runs on the server.

1. Every push to `main` starts the [deploy workflow](../.github/workflows/deploy.yml).
2. It builds one [Docker image](../Dockerfile) for all bots from that commit. Type checks and tests run inside the build, so a failing test means no image.
3. The image goes to [ghcr.io/medzuslovjansky/duhi](https://github.com/medzuslovjansky/duhi/pkgs/container/duhi), and GitHub attests that its digest was built by this workflow from this commit.
4. The server pulls the image by that digest and runs what [compose.yml](../compose.yml) lists.
5. The bot writes a link to its commit into its Discord profile. The workflow succeeds only after it reads that link back from Discord.

To check for yourself:

- The **Deployments** block of this repository shows which commit is in `production`.
- The bot's profile in Discord ("About Me") links to the same commit. Mentioning the bot with no other text answers with the same commit.
- The summary of the workflow run shows the image digest the server runs. This command confirms where that image came from:

```bash
gh attestation verify oci://ghcr.io/medzuslovjansky/duhi@sha256:... --repo medzuslovjansky/duhi
```

## What this cannot show

All of this shows what the workflow deployed. It cannot show what an administrator with SSH access to the server did by hand afterwards.
