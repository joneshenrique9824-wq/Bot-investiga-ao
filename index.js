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

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 📌 REGISTRAR COMANDO
const commands = [
  new SlashCommandBuilder()
    .setName("painel-investigacao")
    .setDescription("Envia o painel de solicitação de investigação")
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
})();

// 🚀 BOT ONLINE
client.once("ready", () => {
  console.log(`✅ Logado como ${client.user.tag}`);
});

// 📌 COMANDO PAINEL
client.on("interactionCreate", async (interaction) => {

  // SLASH
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painel-investigacao") {

      const embed = new EmbedBuilder()
        .setTitle("🔍 AUTORIZAÇÃO DE INVESTIGAÇÃO")
        .setDescription("Clique no botão abaixo para solicitar uma investigação.")
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

  // BOTÃO ABRIR FORM
  if (interaction.isButton()) {
    if (interaction.customId === "abrir_form") {

      const modal = new ModalBuilder()
        .setCustomId("form_investigacao")
        .setTitle("Solicitação de Investigação");

      const nome = new TextInputBuilder()
        .setCustomId("nome")
        .setLabel("Seu Nome")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const alvo = new TextInputBuilder()
        .setCustomId("alvo")
        .setLabel("Nome do Alvo")
        .setStyle(TextInputStyle.Short)
        .setRequired(true);

      const motivo = new TextInputBuilder()
        .setCustomId("motivo")
        .setLabel("Motivo da Investigação")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      const provas = new TextInputBuilder()
        .setCustomId("provas")
        .setLabel("Provas Iniciais")
        .setStyle(TextInputStyle.Paragraph)
        .setRequired(true);

      modal.addComponents(
        new ActionRowBuilder().addComponents(nome),
        new ActionRowBuilder().addComponents(alvo),
        new ActionRowBuilder().addComponents(motivo),
        new ActionRowBuilder().addComponents(provas)
      );

      await interaction.showModal(modal);
    }

    // APROVAR / NEGAR
    if (interaction.customId.startsWith("aprovar_") || interaction.customId.startsWith("negar_")) {

      if (!interaction.member.roles.cache.has(process.env.CARGO_JUIZ)) {
        return interaction.reply({ content: "❌ Você não é juiz!", ephemeral: true });
      }

      const aprovado = interaction.customId.startsWith("aprovar_");

      const embed = EmbedBuilder.from(interaction.message.embeds[0])
        .setColor(aprovado ? "Green" : "Red")
        .addFields({
          name: "🔨 Decisão",
          value: aprovado ? "Autorização Deferida ✅" : "Autorização Indeferida ❌"
        });

      await interaction.update({ embeds: [embed], components: [] });
    }
  }

  // MODAL ENVIADO
  if (interaction.isModalSubmit()) {
    if (interaction.customId === "form_investigacao") {

      const nome = interaction.fields.getTextInputValue("nome");
      const alvo = interaction.fields.getTextInputValue("alvo");
      const motivo = interaction.fields.getTextInputValue("motivo");
      const provas = interaction.fields.getTextInputValue("provas");

      const canal = client.channels.cache.get(process.env.CANAL_ANALISE);

      const embed = new EmbedBuilder()
        .setTitle("📂 NOVA SOLICITAÇÃO DE INVESTIGAÇÃO")
        .setColor("Orange")
        .addFields(
          { name: "👤 Solicitante", value: nome },
          { name: "🎯 Alvo", value: alvo },
          { name: "📄 Motivo", value: motivo },
          { name: "📎 Provas", value: provas }
        )
        .setFooter({ text: `ID do usuário: ${interaction.user.id}` });

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

      await interaction.reply({ content: "✅ Solicitação enviada!", ephemeral: true });
    }
  }
});

client.login(process.env.TOKEN);
