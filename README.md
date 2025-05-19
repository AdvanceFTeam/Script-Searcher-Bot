# Script-Searcher-Bot
A Discord bot for searching Roblox scripts, now rewritten in JavaScript.

This is a port of our original Python-based [Script-Searcher-Bot](https://github.com/AdvanceFTeam/Script_Searcher_Discord_Bot) and includes full support for both prefix and slash commands.

---

## 💬 Commands

### Prefix Commands
```
!search <query> [mode]
!bothelp
```

### Slash Commands
```
/search <query> [mode]
/bothelp
````

> `mode` can be either `free` or `paid` (default: `free`).

---

##  Getting Started


Install dependencies:

```bash
npm install discord.js axios dotenv validator date-fns querystring
```

Create a `.env` file and add your bot token:

```env
BOT_TOKEN=your_discord_token_here
```

Start the bot:

```bash
node bot.mjs
```
