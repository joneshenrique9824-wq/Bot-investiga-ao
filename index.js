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

// 🔒 CONFIG (Railway usa ENV do painel)
const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;
const CANAL_ANALISE = process.env.CANAL_ANALISE;
const CARGO_JUIZ = process.env.CARGO_JUIZ;

// 🔍 DEBUG
console.log("TOKEN:", TOKEN ? "OK" : "NÃO DEFINIDO");

// 🚨 VALIDAÇÃO
if (!TOKEN) throw new Error("❌ TOKEN não definido");
if (!CLIENT_ID) throw new Error("❌ CLIENT_ID não definido");
if (!GUILD_ID) throw new Error("❌ GUILD_ID não definido");
if (!CANAL_ANALISE) throw new Error("❌ CANAL_ANALISE não definido");
if (!CARGO_JUIZ) throw new Error("❌ CARGO_JUIZ não definido");

// 🤖 CLIENT
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
const rest = new REST({ version: "10" }).setToken(TOKEN);

(async () => {
  try {
    console.log("🔄 Registrando comandos...");
    await rest.put(
      Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados!");
  } catch (err) {
    console.error("❌ ERRO REST:", err);
  }
})();

// 🚀 ONLINE
client.once("ready", () => {
  console.log(`✅ Online como ${client.user.tag}`);
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
            .setLabel("Motivo da Investigação")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("provas")
            .setLabel("Provas Iniciais")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );

      await interaction.showModal(modal);
    }

    // APROVAR / NEGAR
    if (interaction.customId.startsWith("aprovar_") || interaction.customId.startsWith("negar_")) {

      if (!interaction.member.roles.cache.has(CARGO_JUIZ)) {
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

  // FORMULÁRIO
  if (interaction.isModalSubmit()) {

    const canal = await client.channels.fetch(CANAL_ANALISE).catch(() => null);

    if (!canal) {
      return interaction.reply({
        content: "❌ Canal de análise não encontrado",
        ephemeral: true
      });
    }

    const embed = new EmbedBuilder()
      .setTitle("📂 NOVA SOLICITAÇÃO DE INVESTIGAÇÃO")
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

// 🔑 LOGIN
client.login(TOKEN);
