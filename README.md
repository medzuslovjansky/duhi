# Duhi

Interslavic bots for Discord.

[![Deploy](https://github.com/medzuslovjansky/duhi/actions/workflows/deploy.yml/badge.svg)](https://github.com/medzuslovjansky/duhi/actions/workflows/deploy.yml)
[![production](https://img.shields.io/github/deployments/medzuslovjansky/duhi/production?label=production)](https://github.com/medzuslovjansky/duhi/deployments/production)
[![attestations](https://img.shields.io/badge/build-attested-2ea44f?logo=github)](https://github.com/medzuslovjansky/duhi/attestations)

## Bots

| Bot | What it does | Official user ID |
| --- | --- | --- |
| [![Add discord-spirit-latin to Discord](https://img.shields.io/badge/discord--spirit--latin-5865F2?logo=discord&logoColor=white)](https://discord.com/oauth2/authorize?client_id=1430518339821895750&scope=bot+applications.commands&permissions=84992) | Replies to Cyrillic and Glagolitic messages with the same text in Latin letters. [Commands](#discord-spirit-latin) | `1430518339821895750` |

**Is this the official bot?** Compare its user ID with the table
(in Discord: Settings → Advanced → Developer Mode, then right-click the bot → Copy User ID).
The buttons in the table always add the official bot.
Mention a bot with no other text to see which commit it runs. [Full verification →](docs/VERIFY.md)

Problems and ideas: [open an issue](https://github.com/medzuslovjansky/duhi/issues).

## Commands

### discord-spirit-latin

Silent until turned on in a channel. All commands need the Manage Channels permission.

| Command | Effect |
| --- | --- |
| `/enable` | Turns the bot on in the current channel |
| `/disable` | Turns it off |
| `/status` | Tells whether it is on |

## More

- [Contributing](CONTRIBUTING.md): run and test the bots locally, add a bot
- [Verification](docs/VERIFY.md): how to check what runs on the server
- [Operations](docs/OPERATIONS.md): server, secrets, deployment setup
