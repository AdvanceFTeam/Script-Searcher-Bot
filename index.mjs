// Last Updated: 2025‑05‑19
// Version: 2.5

import {
  Client,
  GatewayIntentBits,
  Partials,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  StringSelectMenuBuilder,
  Events,
  MessageFlags
} from 'discord.js';
import { config } from 'dotenv';
import axios from 'axios';
import { parseISO, format, formatDistanceToNowStrict } from 'date-fns';
import validator from 'validator';
import qs from 'querystring';

config();
const TOKEN = process.env.BOT_TOKEN;
const FALLBACK_IMAGE = 'https://media.tenor.com/jnINmQlMNbsAAAAC/tenor.gif';

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent
  ],
  partials: [Partials.Channel]
});

// — Prevent uncaught errors from killing the process. this happens so much for me for some reason - StevenK-293
                                                                                // skill issue lol - frostbite
client.on('error', console.error);
client.on('shardError', err => console.error('WebSocket shard error', err));
process.on('unhandledRejection', err => console.error('Unhandled promise rejection', err));

// — Fetch scripts from ScriptBlox or RScripts API —
async function fetchScripts(api, query, mode, page = 1) {
  try {
    if (api === 'scriptblox') {
      const url = `https://scriptblox.com/api/script/search?${qs.stringify({ q: query, mode, page })}`;
      const { data } = await axios.get(url);
      if (data?.result?.scripts) {
        return { scripts: data.result.scripts, totalPages: data.result.totalPages, error: null };
      }
      return { scripts: [], totalPages: null, error: `No scripts found for \`${query}\`.` };
    } else {
      const notPaid = mode.toLowerCase() !== 'paid';
      const url = `https://rscripts.net/api/v2/scripts?${qs.stringify({ q: query, page, notPaid })}`;
      const { data } = await axios.get(url);
      if (Array.isArray(data.scripts)) {
        return { scripts: data.scripts, totalPages: null, error: null };
      }
      return { scripts: [], totalPages: null, error: `No scripts found for \`${query}\`.` };
    }
  } catch (e) {
    return { scripts: [], totalPages: null, error: `Error occurred: ${e.message}` };
  }
}

// — Date format —

// i think updatedAt is broken :P
// i fucking hate you stevenk293
// i know, i know

function formatTimestamp(ts) {
  try {
    const dt = parseISO(ts);
    const ago = formatDistanceToNowStrict(dt, { addSuffix: true });
    const fmt = format(dt, 'MM/dd/yyyy | hh:mm:ss a');
    return `${ago} | ${fmt}`;
  } catch {
    return 'Unknown';
  }
}
function formatTimestamps(s) {
  return `**Created At:** ${formatTimestamp(s.createdAt||'')}
**Updated At:** ${formatTimestamp(s.updatedAt||'')}`; 
}

// — script embed —
function makeEmbed(script, page, total, api) {
  const e = new EmbedBuilder().setColor(0x206694);

  if (api === 'scriptblox') {
    e.setTitle(`[SB] ${script.title||'No Title'}`);

    const game     = script.game || {};
    const gameName = game.name || 'Unknown Game';
    const gameLink = game.gameId
      ? `https://www.roblox.com/games/${game.gameId}`
      : 'https://www.roblox.com';

    // Trys the script.image, then legacy game.imageUrl, then fallback (idk wtf i was trying to do here)
    const imgUrl = validator.isURL(script.image || '')
      ? script.image
      : validator.isURL(game.imageUrl || '')
        ? game.imageUrl
        : FALLBACK_IMAGE;

    const type      = script.scriptType?.toLowerCase() === 'paid' ? 'Paid' : 'Free';
    const verified  = script.verified ? '✅ Verified' : '❌ Not Verified';
    const key       = script.key ? `[Key Link](${script.keyLink})` : '✅ No Key';
    const patched   = script.isPatched ? '❌ Patched' : '✅ Not Patched';
    const universal = script.isUniversal ? '🌐 Universal' : 'Not Universal';

    let body = script.script || 'No Script';
    if (body.length > 400) body = body.slice(0, 397) + '...';

    e.addFields(
      { name: 'Game',      value: `[${gameName}](${gameLink})`, inline: true },
      { name: 'Verified',  value: verified, inline: true },
      { name: 'Type',      value: type, inline: true },
      { name: 'Universal', value: universal, inline: true },
      { name: 'Views',     value: `👁️ ${script.views||0}`, inline: true },
      { name: 'Key',       value: key, inline: true },
      { name: 'Patched',   value: patched, inline: true },
      {
        name: 'Links',
        value:
          `[Raw Script](https://rawscripts.net/raw/${script.slug}) – ` +
          `[Page](https://scriptblox.com/script/${script.slug})`
      },
      { name: 'Script',     value: `\`\`\`lua\n${body}\n\`\`\`` },
      { name: 'Timestamps', value: formatTimestamps(script) }
    );

    // Thumbnail + full image (why the fuck did you do this mmsvon - fernishb)
    e.setThumbnail(imgUrl);
    e.setImage(imgUrl);

  } else {
    // RScripts embed
    e.setTitle(`[RS] ${script.title||'No Title'}`);
    const img      = validator.isURL(script.image||'') ? script.image : FALLBACK_IMAGE;
    const views    = script.views   || 0;
    const likes    = script.likes   || 0;
    const dislikes = script.dislikes|| 0;
    const date     = formatTimestamp(script.lastUpdated||script.createdAt||''); 
    const mobile   = script.mobileReady ? '📱 Mobile Ready' : '🚫 Not Mobile Ready';
    const verified = script.user?.verified ? '✅ Verified' : '❌ Not Verified';
    const cost     = script.paid ? '💲 Paid' : '🆓 Free';
    const raw      = script.rawScript || '';
    const block    = raw
      ? `\`\`\`lua\nloadstring(game:HttpGet("${raw}"))()\n\`\`\``
      : '⚠️ No script content.';

    e.addFields(
      { name:'Views',     value:`👁️ ${views}`, inline:true },
      { name:'Likes',     value:`👍 ${likes}`, inline:true },
      { name:'Dislikes',  value:`👎 ${dislikes}`, inline:true },
      { name:'Mobile',    value:mobile, inline:true },
      { name:'Verified',  value:verified, inline:true },
      { name:'Cost',      value:cost, inline:true },
      { name:'Script',    value:block },
      { name:'Links',     value:`[Page](https://rscripts.net/script/${script.slug})` },
      { name:'Date',      value:date, inline:true }
    );
    e.setAuthor({
      name: script.user?.username||'Unknown',
      iconURL: script.user?.image||FALLBACK_IMAGE
    });
    e.setImage(img);
  }

  e.setFooter({
    text: `Made by AdvanceFalling | Powered by ${
      api==='scriptblox'?'ScriptBlox':'RScripts'
    } | Page ${page}/${total}`
  });

  return e;
}

// — Build pagination/action rows —
// this part took me way too long to figure out idk why 😭 - StevenK-293
                                        // lol - mmsvon
                                        // can't we make this shorter
function makeNavigationRows(script, page, total, api) {
  const row1 = new ActionRowBuilder();
  if (total!==null) {
    if (page>1) {
      row1.addComponents(
        new ButtonBuilder().setCustomId('first').setLabel('⏪').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary)
      );
    }
    row1.addComponents(
      new ButtonBuilder()
        .setCustomId(`page_${page}`)
        .setLabel(`Page ${page}/${total}`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true)
    );
    if (page<total) {
      row1.addComponents(
        new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId('last').setLabel('⏩').setStyle(ButtonStyle.Primary)
      );
    }
  } else {
    if (page>1) {
      row1.addComponents(
        new ButtonBuilder().setCustomId('prev').setLabel('◀️').setStyle(ButtonStyle.Primary)
      );
    }
    row1.addComponents(
      new ButtonBuilder()
        .setCustomId(`page_${page}`)
        .setLabel(`Page ${page}/?`)
        .setStyle(ButtonStyle.Secondary)
        .setDisabled(true),
      new ButtonBuilder().setCustomId('next').setLabel('▶️').setStyle(ButtonStyle.Primary)
    );
  }

  const row2 = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setLabel('View')
      .setStyle(ButtonStyle.Link)
      .setURL(
        api==='scriptblox'
          ? `https://scriptblox.com/script/${script.slug}`
          : `https://rscripts.net/script/${script.slug}`
      ),
    new ButtonBuilder()
      .setLabel('Raw')
      .setStyle(ButtonStyle.Link)
      .setURL(
        api==='scriptblox'
          ? `https://rawscripts.net/raw/${script.slug}`
          : script.rawScript||FALLBACK_IMAGE
      ),
    new ButtonBuilder()
      .setLabel('Download')
      .setStyle(ButtonStyle.Link)
      .setURL(
        api==='scriptblox'
          ? `https://scriptblox.com/download/${script._id}`
          : script.rawScript||FALLBACK_IMAGE
      ),
    new ButtonBuilder().setCustomId('copy').setLabel('Copy').setStyle(ButtonStyle.Primary)
  );

  return [row1, row2];
}

// — "Dynamic" pagination for ScriptBlox —
async function displayDynamic(interaction, pagingMsg, query, mode, api) {
  let page = 1, total = null;
  const user = interaction.user;

  while (true) {
    const { scripts, totalPages, error } = await fetchScripts(api, query, mode, page);
    if (error) {
      await interaction.followUp({ content:error, flags:MessageFlags.Ephemeral });
      break;
    }
    if (!scripts.length) {
      await interaction.followUp({ content:'No scripts found.', flags:MessageFlags.Ephemeral });
      break;
    }
    if (totalPages!==undefined) total = totalPages;

    const script = scripts[0];
    const embed = makeEmbed(script, page, total ?? '?', api);
    const [row1,row2] = makeNavigationRows(script, page, total, api);

    await pagingMsg.edit({ embeds:[embed], components:[row1,row2] });

    try {
      const click = await interaction.channel.awaitMessageComponent({
        filter: i => i.user.id===user.id && i.message.id===pagingMsg.id,
        time:30000
      });

      if (click.customId==='copy') {
        const content = api==='scriptblox'
          ? script.script
          : `loadstring(game:HttpGet("${script.rawScript}"))()`;
        await click.reply({ content:`\`\`\`lua\n${content}\n\`\`\``, flags:MessageFlags.Ephemeral });
        continue;
      }
      if (click.customId==='prev'  && page>1) page--;
      else if (click.customId==='next' && (total===null||page<total)) page++;
      else if (click.customId==='first') page=1;
      else if (click.customId==='last'  && total!==null) page=total;

      await click.deferUpdate();
    } catch {
      await pagingMsg.edit({ content:'Interaction timed out.', components:[] });
      break;
    }
  }
}

// — "Local" pagination for RScripts —
async function displayLocal(interaction, pagingMsg, scripts, api) {
  if (!scripts.length) {
    await interaction.followUp({ content:'No scripts found.', flags:MessageFlags.Ephemeral });
    return;
  }
  let idx = 0, total = scripts.length;
  const user = interaction.user;

  while (true) {
    const script = scripts[idx];
    const embed = makeEmbed(script, idx+1, total, api);
    const [row1,row2] = makeNavigationRows(script, idx+1, total, api);

    await pagingMsg.edit({ embeds:[embed], components:[row1,row2] });

    try {
      const click = await interaction.channel.awaitMessageComponent({
        filter: i => i.user.id===user.id && i.message.id===pagingMsg.id,
        time:30000
      });

      if (click.customId==='copy') {
        const content = api==='scriptblox'
          ? script.script
          : `loadstring(game:HttpGet("${script.rawScript}"))()`;
        await click.reply({ content:`\`\`\`lua\n${content}\n\`\`\``, flags:MessageFlags.Ephemeral });
        continue;
      }
      if (click.customId==='prev' && idx>0) idx--;
      else if (click.customId==='next' && idx<total-1) idx++;
      else if (click.customId==='first') idx=0;
      else if (click.customId==='last')  idx=total-1;

      await click.deferUpdate();
    } catch {
      await pagingMsg.edit({ content:'Interaction timed out.', components:[] });
      break;
    }
  }
}

// we need more instructions for this - StevenK-293
// i know, i know but im lazy lol - mmsvon
// this looks a mess
function makeHelp() {
  return new EmbedBuilder()
    .setTitle('🔍 Script Search Help')
    .setDescription(`
**Prefix Commands:**
\`!search <query> [mode]\`  
\`!bothelp\`

**Slash Commands:**  
\`/search <query> [mode]\`  
\`/bothelp\`  

Modes: \`free\`, \`paid\` (default: \`free\`).
  `.trim())
    .setColor(0x3498db)
    .setThumbnail('https://media.tenor.com/j9Jhn5M1Xw0AAAAd/tenor.gif');
}

// — Prefix commands —
client.on('messageCreate', msg => {
  if (msg.author.bot) return;
  const parts = msg.content.trim().split(/\s+/);
  const cmd = parts.shift().toLowerCase();

  if (cmd === '!bothelp') {
    return msg.channel.send({ embeds:[makeHelp()] });
  }
  if (cmd === '!search') {
    const [query, mode='free'] = parts;
    if (!query) return msg.channel.send({ embeds:[makeHelp()] });

    const select = new StringSelectMenuBuilder()
      .setCustomId(`api_sel|${query}|${mode}`)
      .setPlaceholder('Choose API…')
      .addOptions([
        { label:'ScriptBlox', value:'scriptblox', description:'ScriptBlox API' },
        { label:'Rscripts',   value:'rscripts',   description:'RScripts API' }
      ]);

    return msg.channel.send({
      content:'Select the API:',
      components:[ new ActionRowBuilder().addComponents(select) ]
    });
  }
});

// — Slash commands & select menu handler —
//who the fuck coded this
// i think fernishb
client.on(Events.InteractionCreate, async intr => {
  if (intr.isChatInputCommand()) {
    if (intr.commandName==='bothelp') {
      return intr.reply({ embeds:[makeHelp()], flags:MessageFlags.Ephemeral });
    }
    if (intr.commandName==='search') {
      const query = intr.options.getString('query');
      const mode  = intr.options.getString('mode')||'free';

      const select = new StringSelectMenuBuilder()
        .setCustomId(`api_sel|${query}|${mode}`)
        .setPlaceholder('Choose API…')
        .addOptions([
          { label:'ScriptBlox', value:'scriptblox', description:'ScriptBlox API' },
          { label:'Rscripts',   value:'rscripts',   description:'RScripts API' }
        ]);

      return intr.reply({
        content:'Select the API:',
        components:[ new ActionRowBuilder().addComponents(select) ],
        flags:MessageFlags.Ephemeral
      });
    }
  }

  if (intr.isStringSelectMenu()) {
    const [_, query, mode] = intr.customId.split('|');
    const api = intr.values[0];

    await intr.deferReply({ flags:MessageFlags.Ephemeral });
    await intr.followUp({ content:`Searching ${api}…`, flags:MessageFlags.Ephemeral });

    const pagingMsg = await intr.followUp({
      content:'Fetching data…',
      fetchReply:true
    });

    if (api==='scriptblox') {
      await displayDynamic(intr, pagingMsg, query, mode, api);
    } else {
      const { scripts, error } = await fetchScripts('rscripts', query, mode, 1);
      if (error) {
        await intr.followUp({ content:error, flags:MessageFlags.Ephemeral });
      } else {
        await displayLocal(intr, pagingMsg, scripts, api);
      }
    }
  }
});

// — Ready & reconnect loop —

// why do we have this - yellowgreg
// because - mmsvon
// i think it was for the old bot - StvenK-293
client.once('ready', () => {
  client.user.setActivity('Script Searcher | /search or !search');
  console.log(`Bot ready 🤖 | Serving ${client.guilds.cache.size} servers`);
});

(async function start() {
  while (true) {
    try {
      await client.login(TOKEN);
      break;
    } catch (err) {
      console.error(`Login failed: ${err.message}. Retrying in 5s…`);
      await new Promise(r => setTimeout(r, 5000));
    }
  }
})();
