# Duhi

Interslavic bots for Discord.

[![Deploy](https://github.com/medzuslovjansky/duhi/actions/workflows/deploy.yml/badge.svg)](https://github.com/medzuslovjansky/duhi/actions/workflows/deploy.yml)
[![production](https://img.shields.io/github/deployments/medzuslovjansky/duhi/production?label=production)](https://github.com/medzuslovjansky/duhi/deployments/production)
[![attestations](https://img.shields.io/badge/build-attested-2ea44f?logo=github)](https://github.com/medzuslovjansky/duhi/attestations)

## discord-spirit-latin

When someone writes in Cyrillic or Glagolitic, the bot replies with the same text in Latin letters.

[![Add to Discord](https://img.shields.io/badge/Add_to_Discord-5865F2?logo=discord&logoColor=white&style=for-the-badge)](https://discord.com/oauth2/authorize?client_id=1430518339821895750&scope=bot+applications.commands&permissions=84992)

The bot stays silent until you turn it on in a channel. These commands need the Manage Channels permission:

- `/enable` turns it on in the current channel
- `/disable` turns it off
- `/status` tells whether it is on

**Is this the official bot?** Its user ID is `1430518339821895750`
(in Discord: Settings → Advanced → Developer Mode, then right-click the bot → Copy User ID).
The "Add to Discord" button above always installs this one.
Mention the bot with no other text to see which commit it runs. [Full verification →](docs/VERIFY.md)

Problems and ideas: [open an issue](https://github.com/medzuslovjansky/duhi/issues).

## More

- [Contributing](CONTRIBUTING.md): run and test the bots locally
- [Verification](docs/VERIFY.md): how to check what runs on the server
- [Operations](docs/OPERATIONS.md): server, secrets, deployment setup
