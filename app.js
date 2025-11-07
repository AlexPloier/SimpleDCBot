// requirements
const discord = require("discord.js");
const cron = require("node-cron");
const fs = require("fs");

// EmbedBuilder creates new Posts on its own
// SlashCommandBuilder creates a new slash command
// GuildScheduled... is for scheduled events
const { EmbedBuilder,
    SlashCommandBuilder,
    GuildScheduledEventManager,
    GuildScheduledEventPrivacyLevel,
    GuildScheduledEventEntityType } = require("discord.js")

// here are the privacy things
const { token } =  require("./config.json");
const prefix = "!"

// discord intents - content we want to have in the bot
// discord partials - data returned from an object 
const client = new discord.Client({
    intents: [
        discord.GatewayIntentBits.DirectMessages,
        discord.GatewayIntentBits.MessageContent,
        discord.GatewayIntentBits.GuildMembers,
        discord.GatewayIntentBits.Guilds,
        discord.GatewayIntentBits.GuildMessages,
        discord.GatewayIntentBits.GuildScheduledEvents

    ], 
    partials: [
        discord.Partials.Channel,
        discord.Partials.GuildMember,
        discord.Partials.Message,
        discord.Partials.User
    ]
});

// Space for constant links
// All welcome messages are stored in the welcome_messages.json file
const WELCOME_FILE = "./welcome_messages.json";

// load saved messages from json file
// if it does not exist, an empty one is created
let welcomeMessages = {};
if (fs.existsSync(WELCOME_FILE)) {
  try {
    const data = fs.readFileSync(WELCOME_FILE, 'utf8');
    welcomeMessages = data ? JSON.parse(data) : {};
  } catch (err) {
    console.error('⚠️ Could not parse welcome_messages.json. Resetting file.', err);
    welcomeMessages = {};
    fs.writeFileSync(WELCOME_FILE, '{}');
  }
}

//Ready event captures the state when the bot gets online
client.on("clientReady", (client) => {
    console.log("This bot is now online " + client.user.tag)
});

// Messages - The discord bot responds to these
// Complete Message documentation is to be found here:
// old.discordjs.dev/#/docs/discord.js/main/class/Message
client.on("messageCreate", async (message) => {
    // Checks if the msg is written by a bot
    if(message.author.bot==true){
        return;
    }

    // Check if the msg starts with the prefix
    if(!message.content.startsWith("!")){
        return;
    }

    // Seperate prefix, command, and argument
    const args = message.content.slice(prefix.length).trim().split(/ (.+)/);
    // After args.shift -> args is now without the command
    // !poll Question;Answer -> Question;Answer
    const command = args.shift().toLowerCase();

    // Help command
    if (command === "help") {
    const helpMessage = `
**🤖 Available Commands:**

**!help**  
Shows this help message.

**!poll Question;Answer1;Answer2;...;Answer10**  
Creates a poll with up to 10 possible answers.  
➡️ Example: \`!poll What's your favorite color?;Red;Blue;Green\`

**!setwelcome Your welcome message**  
Sets a custom welcome message for this server. *(Admin only)*  
➡️ Example: \`!setwelcome Welcome to our server, {user}!\`

**!deletewelcome**  
Deletes the currently set welcome message. *(Admin only)*

**!role @user1 @user2 ; role1 ; role2**  
Adds or removes the specified roles for the mentioned users.  
➡️ Example: \`!role @Alice @Bob ; Gamer ; Streamer\`

**!userinfo @user**  
Displays information about a mentioned user (or yourself if no one is mentioned).  
➡️ Example: \`!userinfo @Alice\`

**!serverinfo**  
Displays detailed information about the server, such as member count, roles, and welcome message status.
`;

    message.reply(helpMessage);
    }

    // Poll command
    // !poll Question;Answer1;Answer2
    if(command === "poll"){
        const argsPoll = args[0].split(";");
        const questionPoll = argsPoll[0].trim();
        const answersPoll =argsPoll.slice(1).map(answer => answer.trim());
        var poll = [];

        // Error msg when !poll is called without enough arguments
        if (!questionPoll || answersPoll.length <2 || answersPoll.length >10){
            return message.channel.send("Please type in a question and at least two answers. All have to be seperated by a semicolon ; . The maximum amount of answers is ten (10).");
        }

        for (let i=0;i<answersPoll.length;i++){
            poll += answersPoll[i]+ " ";
        }

         let questionText = `**${questionPoll}**\n`;
        const emojis = ['🇦', '🇧', '🇨', '🇩', '🇪', '🇫', '🇬', '🇭', '🇮', '🇯'];

        answersPoll.forEach((option, index) => {
            questionText += `${emojis[index]} ${option}\n`;
        });

        const questionMessage = await message.channel.send(questionText);

        answersPoll.forEach((_,index) => {
            questionMessage.react(emojis[index]);
        });
    }

    // Set welcome message 
    // !setwelcome
    if(command === "setwelcome"){
        // Check for Admin rights
        if(!message.member.permissions.has("Administrator")){
            return message.reply("❌You do not have permission to do that.");
        }

        const newwelcomeMessage = args[0];
        if (!newwelcomeMessage){
            return message.reply("⚠️Please add a welcome message for your server.");
        }

        welcomeMessages[message.guild.id] = newwelcomeMessage.trim();
        fs.writeFileSync(WELCOME_FILE, JSON.stringify(welcomeMessages, null, 2));
        return message.reply("✅New welcome message set to: **"+newwelcomeMessage+"**");
    }

    // Delete welcome message
    // !deletewelcome
    if(command === "deletewelcome"){
        if(!message.member.permissions.has("Administrator")){
            return message.reply("❌You do not have permission to do that.");
        }

        if(!welcomeMessages[message.guild.id]){
            return message.reply("⚠️There is no welcome message set here.");
        }
        delete welcomeMessages[message.guild.id];
        fs.writeFileSync(WELCOME_FILE, JSON.stringify(welcomeMessages, null, 2));
        message.reply("✅The welcome message for this server was deleted succesfully.");
    }

    // Roles command
    // !role @user1 @user2 ; role1 ;role2
    // Adds role1 and role2 to the user, or if user already has those it removes them.
    if(command === "role"){
        const argsRole = args[0].split(";");
        const roleNames = argsRole.slice(1).map(r => r.trim());
        const mentionedMembers = message.mentions.members;

         // 🔒 Permission & hierarchy checks
        const botMember = message.guild.members.me; // this is the bot
        if (!botMember.permissions.has("ManageRoles")) {
            return message.channel.send("❌I do not have permission to manage roles!");
        }

        // Verification
        if (mentionedMembers.size === 0 || roleNames.length < 1){
            return message.channel.send("❌Please do mention one or more users and at least one role to your command.");
        }

         // We'll store results for a summary
        const summary = {
            added: [],
            removed: [],
            failed: [],
            skipped: []
        };

        // Loop through mentioned users
        for (const [memberId, userRole] of mentionedMembers){
            if(userRole.user.bot) continue;

            for (const roleName of roleNames) {
            const role = message.guild.roles.cache.find(r => r.name === roleName);
            if (!role) {
                summary.failed.push(`❌ Role **${roleName}** not found.`);
                continue;
            }

            // Hierarchy check
            if (role.position >= botMember.roles.highest.position) {
                summary.failed.push(`⚠️ Cannot manage role **${roleName}** — it’s higher or equal to my highest role.`);
                continue;
            }

            // Try add/remove
            try {
                if (userRole.roles.cache.has(role.id)) {
                    await userRole.roles.remove(role);
                    summary.removed.push(`Removed **${roleName}** from **${userRole.displayName}**`);
                } else {
                    await userRole.roles.add(role);
                    summary.added.push(`Added **${roleName}** to **${userRole.displayName}**`);
                }
            } catch (err) {
                console.error(err);
                summary.failed.push(`⚠️ Failed to modify **${roleName}** for **${userRole.displayName}** (missing permission or hierarchy issue).`);
            }
        }
    }

    // 🧹 Remove duplicate lines
    for (const key of Object.keys(summary)) {
        summary[key] = [...new Set(summary[key])];
    }

    // 🧾 Build final summary message
    let resultMessage = `**Role update summary:**\n`;

    if (summary.added.length > 0)
        resultMessage += `\n✅ **Added:**\n• ${summary.added.join("\n• ")}\n`;
    if (summary.removed.length > 0)
        resultMessage += `\n🧹 **Removed:**\n• ${summary.removed.join("\n• ")}\n`;
    if (summary.failed.length > 0)
        resultMessage += `\n⚠️ **Failed:**\n• ${summary.failed.join("\n• ")}\n`;
    if (
        summary.added.length === 0 &&
        summary.removed.length === 0 &&
        summary.failed.length === 0
    )
        resultMessage += `\nNothing changed.`

    await message.channel.send(resultMessage);
        
    }

    // Userinfo command
    // !userinfo @user1 @user2
    // Returns basic information about the users
    if(command === "userinfo"){
        let member =
            message.mentions.members.first() ||
            message.member;

        const roles = member.roles.cache
            .filter((r) => r.id !== message.guild.id)
            .map((r) => r.toString())
            .join(', ') || 'Keine Rollen';
        
        const embed = new EmbedBuilder()
            .setTitle(`Userinfo: ${member.user.tag}`)
            .setColor(0xdcff73)
            .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
            .addFields(
            {
              name: '📅 Beitritt Server',
              value: `<t:${Math.floor(member.joinedTimestamp / 1000)}:F>`,
              inline: true,
            },
            { name: '🏷️ Rollen', value: roles, inline: false }
            )
            .setFooter({
                text: `Abgefragt von ${message.author.tag}`,
                iconURL: message.author.displayAvatarURL({ dynamic: true }),
            })
            .setTimestamp();
    await message.channel.send({ embeds: [embed] });
    }

    // Serverinfo command
    // !serverinfo
     if (command === 'serverinfo') {
    const { guild } = message;

    const embed = new EmbedBuilder()
      .setTitle(`🏠 Serverinfo: ${guild.name}`)
      .setColor(0x8ca0ff)
      .setThumbnail(guild.iconURL({ dynamic: true, size: 1024 }))
      .addFields(
        { name: '🆔 Server ID', value: guild.id, inline: true },
        {
          name: '👑 Owner',
          value: guild.ownerId
            ? `<@${guild.ownerId}>`
            : 'Unbekannt',
          inline: true,
        },
        { name: '👥 Members', value: `${guild.memberCount}`, inline: true },
        { name: '💬 Textchannels', value: `${guild.channels.cache.filter(c => c.type === 0).size}`, inline: true },
        { name: '🔊 Voicechannels', value: `${guild.channels.cache.filter(c => c.type === 2).size}`, inline: true },
        { name: '🎭 Roles', value: `${guild.roles.cache.size}`, inline: true },
        { name: '📅 Created at', value: `<t:${Math.floor(guild.createdTimestamp / 1000)}:F>`, inline: false },
        { name: 'Welcome Message is set to', value:`${welcomeMessages[message.guild.id]}`}
      )
      .setFooter({
        text: `Abgefragt von ${message.author.tag}`,
        iconURL: message.author.displayAvatarURL({ dynamic: true }),
      })
      .setTimestamp();

    await message.channel.send({ embeds: [embed] });
  }
});

// Events - The discord bot shall react to these events
// A new person joins a server
client.on("guildMemberAdd", async (member) => {
  const welcomeMsg = welcomeMessages[member.guild.id];
  if (!welcomeMsg) return; // do nothing if not welcomeMessage was set

  // mention the user with @
  const personalizedMsg = welcomeMsg.replace("{user}", `${member.displayName}`);

  const embed = new EmbedBuilder()
  .setTitle(`${personalizedMsg}`)
  .setColor(0x8ca0ff)
  .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 1024 }))
  .setTimestamp();

  // Send in the first channel with writing rights.
  const channel = member.guild.channels.cache
    .filter(ch => ch.isTextBased() && ch.permissionsFor(member.guild.members.me).has("SendMessages"))
    .first();

  if (channel) {
    await channel.send({ embeds : [embed] });
  }
});

client.login(token);