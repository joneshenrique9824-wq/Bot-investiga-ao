import { REST, Routes, SlashCommandBuilder } from "discord.js";

export async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("painel-investigacao")
      .setDescription("Abrir sistema tribunal RP")
  ];

  const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(
      process.env.CLIENT_ID,
      process.env.GUILD_ID
    ),
    { body: commands }
  );
}
