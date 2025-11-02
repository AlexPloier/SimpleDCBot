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
const WELCOME_FILE = "./welcome_messages.json";

// load saved messages
let welcomeMessages = {};
if(fs.existsSync(WELCOME_FILE)){
    welcomeMessages = JSON.parse(fs.readFileSync(WELCOME_FILE,"utf-8"));
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
    if(command === "help"){
        message.reply("This bot has the following commands: \n!help \n!poll A question with a maximum of 10 answers called via \"!poll Question;Answer1;Answer2;...;Answer10\"")
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
            return message.reply("You do not have permission to do that.");
        }

        const newwelcomeMessage = args[0];
        if (!newwelcomeMessage){
            return message.reply("Please add a welcome message for your server.");
        }

        welcomeMessages[message.guild.id] = newwelcomeMessage.trim();
        fs.writeFileSync(WELCOME_FILE, JSON.stringify(welcomeMessages, null, 2));
        return message.reply("New welcome message set to: **"+newwelcomeMessage+"**");
    }

    // Delete welcome message
    // !deletewelcome
    if(command === "deletewelcome"){
        if(!message.member.permissions.has("Administrator")){
            return message.reply("You do not have permission to do that.");
        }

        if(!welcomeMessages[message.guild.id]){
            return message.reply("There is no welcome message set here.");
        }
        delete welcomeMessages[message.guild.id];
        fs.writeFileSync(WELCOME_FILE, JSON.stringify(welcomeMessages, null, 2));
        message.reply("The welcome message for this server was deleted succesfully.");
    }
});

// Events - The discord bot shall react to these events
client.on("guildMemberAdd", async (member) => {
  const welcomeMsg = welcomeMessages[member.guild.id];
  if (!welcomeMsg) return; // do nothing if not welcomeMessage was set

  // mention the user with @
  const personalizedMsg = welcomeMsg.replace("{user}", `<@${member.id}>`);

  // Send in the first channel with writing rights.
  const channel = member.guild.channels.cache
    .filter(ch => ch.isTextBased() && ch.permissionsFor(member.guild.members.me).has("SendMessages"))
    .first();

  if (channel) {
    channel.send(personalizedMsg);
  }
});

client.login(token);