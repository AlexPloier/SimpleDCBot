# SimpleDCBot
A simple discord bot, which covers basic functionality. Such as welcome-msg, polls, reocurring polls, etc.

# Done
* Added a simple poll function. Called via "!poll Question;Answer1;...;Answer10". People can then react on the message for results.
* Added a setwelcome function. Called via "!setwelcome Hei {user}, this is a personalized welcome message". {user} is replaced with a mention of the specified user. Messages are safed even if bot shuts down.
* Added a deletewelcome function. Called via "!deletewelcome" which deletes the personalized welcome message for this server set previously via the setwelcome function.

# To-Dos
* Add an embedded msg which shows people wanting to group together
* Personal reocurring polls, with saved entries even if bot shuts down for a while
* Link to youtube, twitch, etc. for new uploades / highlights
* Auto assign and manual assign roles
