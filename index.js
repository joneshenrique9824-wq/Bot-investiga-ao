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
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField
} from "discord.js";

// 🔒 VALIDAÇÃO
if (!process.env.TOKEN) throw new Error("TOKEN não definido");
if (!process.env.CLIENT_ID) throw new Error("CLIENT_ID não definido");
if (!process.env.GUILD_ID) throw new Error("GUILD_ID não definido");
if (!process.env.CARGO_JUIZ) throw new Error("CARGO_JUIZ não definido");

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

// 📌 COMANDO
const commands = [
  new SlashCommandBuilder()
    .setName("painel-investigacao")
    .setDescription("Abrir painel de investigação")
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

// 📡 REGISTRAR
(async () => {
  try {
    console.log("🔄 Registrando comandos...");
    await rest.put(
      Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
      { body: commands }
    );
    console.log("✅ Comandos registrados!");
  } catch (err) {
    console.error("❌ Erro:", err);
  }
})();

// 🚀 ONLINE
client.once("ready", () => {
  console.log(`✅ Logado como ${client.user.tag}`);
});

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {

  // 🔹 SLASH
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painel-investigacao") {

      const embed = new EmbedBuilder()
        .setTitle("🔍 AUTORIZAÇÃO DE INVESTIGAÇÃO")
        .setDescription("Clique abaixo para abrir uma solicitação.")
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

  // 🔹 BOTÕES
  if (interaction.isButton()) {

    // 📋 ABRIR FORM
    if (interaction.customId === "abrir_form") {

      const modal = new ModalBuilder()
        .setCustomId("form_investigacao")
        .setTitle("Nova Investigação");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("nome")
            .setLabel("Seu nome")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("alvo")
            .setLabel("Nome do alvo")
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

      return interaction.showModal(modal);
    }

    // ⚖️ AÇÕES DO JUIZ
    if (
      interaction.customId === "aprovar" ||
      interaction.customId === "negar" ||
      interaction.customId === "encerrar"
    ) {

      if (!interaction.member.roles.cache.has(process.env.CARGO_JUIZ)) {
        return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });
      }

      const embed = EmbedBuilder.from(interaction.message.embeds[0]);

      let status = "";
      let log = "";

      if (interaction.customId === "aprovar") {
        status = "🟢 Investigação AUTORIZADA";
        log = "Investigação aprovada pelo juiz";
        embed.setColor("Green");
      }

      if (interaction.customId === "negar") {
        status = "🔴 Investigação NEGADA";
        log = "Investigação negada pelo juiz";
        embed.setColor("Red");
      }

      if (interaction.customId === "encerrar") {
        status = "⚫ Caso ENCERRADO";
        log = "Caso encerrado";
        embed.setColor("Grey");
      }

      // atualizar campos
      const fields = embed.data.fields;

      fields[4].value = status;
      fields[5].value += `\n• ${log}`;

      embed.setFields(fields);

      await interaction.update({ embeds: [embed] });
    }
  }

  // 📂 FORM ENVIADO
  if (interaction.isModalSubmit()) {

    const nome = interaction.fields.getTextInputValue("nome");
    const alvo = interaction.fields.getTextInputValue("alvo");
    const motivo = interaction.fields.getTextInputValue("motivo");
    const provas = interaction.fields.getTextInputValue("provas");

    // 📁 CRIAR CATEGORIA SE NÃO EXISTIR
    let categoria = interaction.guild.channels.cache.find(
      c => c.name === "📂 INVESTIGAÇÕES"
    );

    if (!categoria) {
      categoria = await interaction.guild.channels.create({
        name: "📂 INVESTIGAÇÕES",
        type: ChannelType.GuildCategory
      });
    }

    // 📂 CRIAR CANAL
    const canal = await interaction.guild.channels.create({
      name: `📂・${alvo.toLowerCase().replace(/ /g, "-")}`,
      type: ChannelType.GuildText,
      parent: categoria.id,
      permissionOverwrites: [
        {
          id: interaction.guild.id,
          deny: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: interaction.user.id,
          allow: [PermissionsBitField.Flags.ViewChannel]
        },
        {
          id: process.env.CARGO_JUIZ,
          allow: [PermissionsBitField.Flags.ViewChannel]
        }
      ]
    });

    // 📄 EMBED PRONTUÁRIO
    const embed = new EmbedBuilder()
      .setTitle("🔍 PRONTUÁRIO DE INVESTIGAÇÃO")
      .setColor("Yellow")
      .addFields(
        { name: "👤 Solicitante", value: `${nome} (${interaction.user.id})` },
        { name: "🎯 Alvo", value: alvo },
        { name: "📄 Motivo", value: motivo },
        { name: "📎 Provas", value: provas },
        { name: "⏰ Status", value: "🟡 Aguardando análise" },
        { name: "📜 Logs", value: "• Solicitação criada\n• Aguardando decisão judicial" }
      );

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setCustomId("aprovar")
        .setLabel("Aprovar")
        .setStyle(ButtonStyle.Success),
      new ButtonBuilder()
        .setCustomId("negar")
        .setLabel("Negar")
        .setStyle(ButtonStyle.Danger),
      new ButtonBuilder()
        .setCustomId("encerrar")
        .setLabel("Encerrar")
        .setStyle(ButtonStyle.Secondary)
    );

    await canal.send({ embeds: [embed], components: [botoes] });

    await interaction.reply({
      content: `✅ Prontuário criado: ${canal}`,
      ephemeral: true
    });
  }
});

client.login(process.env.TOKEN);
