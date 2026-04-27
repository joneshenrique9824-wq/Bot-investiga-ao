import "dotenv/config";
import { Client, GatewayIntentBits } from "discord.js";

import { registerCommands } from "./commands.js";
import { handleInteractions } from "./processes.js";

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

await registerCommands();

client.once("ready", () => {
  console.log(`⚖️ Tribunal online: ${client.user.tag}`);
});

client.on("interactionCreate", (i) => handleInteractions(i));

client.login(process.env.TOKEN);
