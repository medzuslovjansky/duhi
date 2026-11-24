# Duhi

Interslavic bots for Discord.

[![Deploy](https://github.com/medzuslovjansky/duhi/actions/workflows/deploy.yml/badge.svg)](https://github.com/medzuslovjansky/duhi/actions/workflows/deploy.yml)
[![production](https://img.shields.io/github/deployments/medzuslovjansky/duhi/production?label=production)](https://github.com/medzuslovjansky/duhi/deployments/production)
[![attestations](https://img.shields.io/badge/build-attested-2ea44f?logo=github)](https://github.com/medzuslovjansky/duhi/attestations)
[![hosting](https://img.shields.io/badge/hosting-Hetzner%20cx23%20%C2%B7%20Nuremberg-D50C2D?logo=hetzner&logoColor=white)](docs/OPERATIONS.md)

## Bots

| Bot | What it does | User ID |
| --- | --- | --- |
| [![Add discord-spirit-latin to Discord](https://img.shields.io/badge/discord--spirit--latin-5865F2?logo=discord&logoColor=white)](https://discord.com/oauth2/authorize?client_id=1430518339821895750&scope=bot+applications.commands&permissions=84992) | Replies to Cyrillic and Glagolitic messages with the same text in Latin letters. [Commands](#discord-spirit-latin) | `1430518339821895750` |
| [![Add discord-spirit-slovo to Discord](https://img.shields.io/badge/discord--spirit--slovo-5865F2?logo=discord&logoColor=white)](https://discord.com/oauth2/authorize?client_id=1441016941358878760&scope=bot+applications.commands) | Looks words up in the [Interslavic dictionary](https://interslavic-dictionary.com), from Interslavic or from any language it translates into. [Commands](#discord-spirit-slovo) | `1441016941358878760` |

These bots are used on the [official Interslavic Discord server](https://discord.com/invite/n3saqm27QW).
Add them with the buttons in the table. [How to verify a bot →](docs/VERIFY.md)

Problems and ideas: [open an issue](https://github.com/medzuslovjansky/duhi/issues).

## Commands

### discord-spirit-latin

Silent until turned on in a channel. All commands need the Manage Channels permission.

| Command | Effect |
| --- | --- |
| `/enable` | Turns the bot on in the current channel |
| `/disable` | Turns it off |
| `/status` | Tells whether it is on |

### discord-spirit-slovo

Replies are visible only to the person who asked; a button posts the reply to the channel.

| Command | Effect |
| --- | --- |
| `/gledaj tekst:<word> [jezyk:<language>]` | Finds the word in the dictionary, in any language or in the one given. Suggestions appear while typing. |

Picking a word under the results opens its card: every meaning and the table of forms.

## More

- [Contributing](CONTRIBUTING.md): run and test the bots locally, add a bot
- [Verification](docs/VERIFY.md): how to check what runs on the server
- [Operations](docs/OPERATIONS.md): server, secrets, deployment setup
