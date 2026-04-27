import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  SlashCommandBuilder,
  REST,
  Routes,
  ChannelType,
  PermissionsBitField
} from "discord.js";

import { Low } from "lowdb";
import { JSONFile } from "lowdb/node";

// =========================
// 💾 DATABASE (RAILWAY SAFE)
// =========================
const adapter = new JSONFile("db.json");
const db = new Low(adapter, { processos: [] });

await db.read();
db.data ||= { processos: [] };

// =========================
// BOT
// =========================
const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let contador = 0;

// =========================
// SLASH COMMAND
// =========================
const commands = [
  new SlashCommandBuilder()
    .setName("painel-investigacao")
    .setDescription("Abrir tribunal RP")
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

await rest.put(
  Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
  { body: commands }
);

// =========================
// READY
// =========================
client.once("ready", () => {
  console.log(`⚖️ Tribunal online: ${client.user.tag}`);
});

// =========================
// LOG SYSTEM
// =========================
async function log(guild, msg) {
  let ch = guild.channels.cache.find(c => c.name === "📜-logs");

  if (!ch) {
    ch = await guild.channels.create({
      name: "📜-logs",
      type: ChannelType.GuildText
    });
  }

  ch.send(msg);
}

// =========================
// INTERAÇÕES
// =========================
client.on("interactionCreate", async (interaction) => {

  // 📌 PAINEL
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painel-investigacao") {

      const embed = new EmbedBuilder()
        .setTitle("🏛️ TRIBUNAL RP - SISTEMA JUDICIAL")
        .setColor("Gold")
        .setDescription(`
✔ Processos oficiais
✔ Provas obrigatórias
✔ Audiência controlada
✔ Julgamento formal

Clique abaixo para iniciar processo.
        `);

      const btn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("abrir_form")
          .setLabel("Criar Processo")
          .setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({ embeds: [embed], components: [btn] });
    }
  }

  // =========================
  // FORM
  // =========================
  if (interaction.isButton() && interaction.customId === "abrir_form") {

    const modal = new ModalBuilder()
      .setCustomId("form")
      .setTitle("Novo Processo");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("solicitante").setLabel("Solicitante").setStyle(1)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("alvo").setLabel("Alvo").setStyle(1)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder().setCustomId("motivo").setLabel("Motivo").setStyle(2)
      )
    );

    return interaction.showModal(modal);
  }

  // =========================
  // CRIAR PROCESSO
  // =========================
  if (interaction.isModalSubmit()) {

    await interaction.deferReply({ ephemeral: true });

    const id = `#${String(++contador).padStart(4, "0")}`;

    const solicitante = interaction.fields.getTextInputValue("solicitante");
    const alvo = interaction.fields.getTextInputValue("alvo");
    const motivo = interaction.fields.getTextInputValue("motivo");

    // salvar DB
    db.data.processos.push({
      id,
      solicitante,
      alvo,
      motivo,
      status: "ABERTO",
      logs: []
    });

    await db.write();

    let cat = interaction.guild.channels.cache.find(c => c.name === "📂-tribunal");

    if (!cat) {
      cat = await interaction.guild.channels.create({
        name: "📂-tribunal",
        type: ChannelType.GuildCategory
      });
    }

    const canal = await interaction.guild.channels.create({
      name: `processo-${id}`,
      type: ChannelType.GuildText,
      parent: cat.id
    });

    const embed = new EmbedBuilder()
      .setTitle(`📂 PROCESSO ${id}`)
      .setColor("Yellow")
      .addFields(
        { name: "Solicitante", value: solicitante },
        { name: "Alvo", value: alvo },
        { name: "Motivo", value: motivo },
        { name: "Status", value: "🟡 ABERTO" }
      );

    const btns = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("prova").setLabel("Enviar Prova").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("fechar").setLabel("Encerrar").setStyle(ButtonStyle.Danger)
    );

    await canal.send({ embeds: [embed], components: [btns] });

    await log(interaction.guild, `📂 Processo ${id} criado`);

    return interaction.editReply({ content: `✔ Criado: ${canal}` });
  }

  // =========================
  // PROVA
  // =========================
  if (interaction.isButton()) {

    if (interaction.customId === "prova") {
      return interaction.reply({
        content: "📎 Envie sua prova neste canal (imagem ou texto).",
        flags: 64
      });
    }

    if (interaction.customId === "fechar") {
      return interaction.reply({
        content: "⚖️ Processo encerrado pelo juiz.",
        flags: 64
      });
    }
  }
});

client.login(process.env.TOKEN);
