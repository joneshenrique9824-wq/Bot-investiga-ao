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
  REST,
  Routes,
  SlashCommandBuilder
} from "discord.js";

// 🔒 VALIDAÇÃO ENV
if (!process.env.TOKEN) throw new Error("❌ TOKEN não definido");
if (!process.env.CLIENT_ID) throw new Error("❌ CLIENT_ID não definido");
if (!process.env.GUILD_ID) throw new Error("❌ GUILD_ID não definido");
if (!process.env.CANAL_ANALISE) throw new Error("❌ CANAL_ANALISE não definido");
if (!process.env.CARGO_JUIZ) throw new Error("❌ CARGO_JUIZ não definido");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 📌 COMANDO
const commands = [
  new SlashCommandBuilder()
    .setName("painel-investigacao")
    .setDescription("Abrir painel de investigação")
];

// 📡 REGISTRAR COMANDO
const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  try {
    console.log("🔄 Registrando comandos...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados!");
  } catch (err) {
    console.error("❌ Erro ao registrar comandos:", err);
  }
})();

// 🚀 BOT ONLINE
client.once("ready", () => {
  console.log(`✅ Bot online: ${client.user.tag}`);
});

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {

  // SLASH
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painel-investigacao") {

      const embed = new EmbedBuilder()
        .setTitle("🔍 AUTORIZAÇÃO DE INVESTIGAÇÃO")
        .setDescription("Clique abaixo para solicitar uma investigação.")
        .setColor("Gold");

      const btn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("abrir_form")
          .setLabel("Solicitar Investigação")
          .setStyle(ButtonStyle.Primary)
      );

      await interaction.reply({ embeds: [embed], components: [btn] });
    }
  }

  // BOTÕES
  if (interaction.isButton()) {

    // ABRIR FORM
    if (interaction.customId === "abrir_form") {

      const modal = new ModalBuilder()
        .setCustomId("form_investigacao")
        .setTitle("Solicitação de Investigação");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("nome")
            .setLabel("Seu Nome")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("alvo")
            .setLabel("Nome do Alvo")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("motivo")
            .setLabel("Motivo")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("provas")
            .setLabel("Provas")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );

      await interaction.showModal(modal);
    }

    // APROVAR / NEGAR
    if (interaction.customId.startsWith("aprovar_") || interaction.customId.startsWith("negar_")) {

      if (!interaction.member.roles.cache.has(process.env.CARGO_JUIZ)) {
        return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });
      }

      const aprovado = interaction.customId.startsWith("aprovar_");

      const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(aprovado ? "Green" : "Red")
        .addFields({
          name: "🔨 Decisão",
          value: aprovado ? "Autorizado ✅" : "Negado ❌"
        });

      await interaction.update({ embeds: [embed], components: [] });
    }
  }

  // FORMULÁRIO
  if (interaction.isModalSubmit()) {

    const canal = await client.channels.fetch(process.env.CANAL_ANALISE).catch(() => null);

    if (!canal) {
      return interaction.reply({
        content: "❌ Canal de análise não encontrado",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("📂 Nova Investigação")
      .setColor("Orange")
      .addFields(
        { name: "👤 Solicitante", value: interaction.fields.getTextInputValue("nome") },
        { name: "🎯 Alvo", value: interaction.fields.getTextInputValue("alvo") },
        { name: "📄 Motivo", value: interaction.fields.getTextInputValue("motivo") },
        { name: "📎 Provas", value: interaction.fields.getTextInputValue("provas") }
      )
      .setFooter({ text: `ID: ${interaction.user.id}` });

    const buttons = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId(`aprovar_${interaction.user.id}`)
        .setLabel("Aprovar")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId(`negar_${interaction.user.id}`)
        .setLabel("Negar")
        .setStyle(ButtonStyle.Danger)
    );

    await canal.send({ embeds: [embed], components: [buttons] });

    await interaction.reply({
      content: "✅ Solicitação enviada com sucesso!",
      ephemeral: true
    });
  }
});

client.login(process.env.TOKEN);
