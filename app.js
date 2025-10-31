// requirements
const discord = require("discord.js");
const cron = require("node-cron");

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
const { memoryUsage } = require("process");