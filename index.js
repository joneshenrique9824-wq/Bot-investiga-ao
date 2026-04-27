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

// 🔒 ENV
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
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
})();

// 🚀 ONLINE
client.once("ready", () => {
  console.log(`✅ ${client.user.tag} online`);
});

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {

  // 🔹 COMANDO
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painel-investigacao") {

      const embed = new EmbedBuilder()
        .setTitle("🔍 AUTORIZAÇÃO DE INVESTIGAÇÃO")
        .setDescription("Clique abaixo para abrir um processo.")
        .setColor("Gold");

      const btn = new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("abrir_form")
          .setLabel("Abrir Processo")
          .setStyle(ButtonStyle.Primary)
      );

      return interaction.reply({ embeds: [embed], components: [btn] });
    }
  }

  // 🔘 BOTÕES
  if (interaction.isButton()) {

    // 📋 FORM
    if (interaction.customId === "abrir_form") {

      const modal = new ModalBuilder()
        .setCustomId("form_investigacao")
        .setTitle("Abrir Processo");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("nome").setLabel("Seu nome").setStyle(1).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("alvo").setLabel("Nome do alvo").setStyle(1).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("motivo").setLabel("Motivo").setStyle(2).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("provas").setLabel("Provas").setStyle(2).setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }

    // 👮 ASSUMIR CASO
    if (interaction.customId === "assumir") {

      const embed = EmbedBuilder.from(interaction.message.embeds[0]);
      const fields = embed.data.fields;

      // já assumido
      if (fields[6].value !== "Ninguém") {
        return interaction.reply({ content: "❌ Já assumido", ephemeral: true });
      }

      fields[6].value = `<@${interaction.user.id}>`;
      fields[5].value += `\n• Caso assumido por <@${interaction.user.id}>`;

      embed.setFields(fields);

      // dar acesso ao staff que assumiu
      await interaction.channel.permissionOverwrites.edit(interaction.user.id, {
        ViewChannel: true
      });

      return interaction.update({ embeds: [embed] });
    }

    // ⚖️ DECISÕES
    if (["aprovar", "negar", "encerrar"].includes(interaction.customId)) {

      if (!interaction.member.roles.cache.has(process.env.CARGO_JUIZ)) {
        return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });
      }

      const embed = EmbedBuilder.from(interaction.message.embeds[0]);
      const fields = embed.data.fields;

      let status = "";
      let log = "";

      if (interaction.customId === "aprovar") {
        status = "🟢 AUTORIZADO";
        log = "Juiz aprovou";
        embed.setColor("Green");
      }

      if (interaction.customId === "negar") {
        status = "🔴 NEGADO";
        log = "Juiz negou";
        embed.setColor("Red");
      }

      if (interaction.customId === "encerrar") {
        status = "⚫ ENCERRADO";
        log = "Caso encerrado";
        embed.setColor("Grey");
      }

      fields[4].value = status;
      fields[5].value += `\n• ${log}`;

      embed.setFields(fields);

      return interaction.update({ embeds: [embed], components: [] });
    }
  }

  // 📂 FORM ENVIADO
  if (interaction.isModalSubmit()) {

    const nome = interaction.fields.getTextInputValue("nome");
    const alvo = interaction.fields.getTextInputValue("alvo");
    const motivo = interaction.fields.getTextInputValue("motivo");
    const provas = interaction.fields.getTextInputValue("provas");

    // 📁 categoria
    let categoria = interaction.guild.channels.cache.find(c => c.name === "📂 INVESTIGAÇÕES");

    if (!categoria) {
      categoria = await interaction.guild.channels.create({
        name: "📂 INVESTIGAÇÕES",
        type: ChannelType.GuildCategory
      });
    }

    // 🔒 canal privado
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

    // 📄 EMBED
    const embed = new EmbedBuilder()
      .setTitle("📂 PROCESSO DE INVESTIGAÇÃO")
      .setColor("Yellow")
      .addFields(
        { name: "👤 Criado por", value: `<@${interaction.user.id}>` },
        { name: "📛 Nome informado", value: nome },
        { name: "🎯 Alvo", value: alvo },
        { name: "📄 Motivo", value: motivo },
        { name: "⏰ Status", value: "🟡 Em análise" },
        { name: "📜 Logs", value: "• Processo criado" },
        { name: "👮 Responsável", value: "Ninguém" }
      );

    // 🔘 botões
    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("assumir").setLabel("Assumir Caso").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("aprovar").setLabel("Aprovar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("negar").setLabel("Negar").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("encerrar").setLabel("Encerrar").setStyle(ButtonStyle.Secondary)
    );

    await canal.send({ embeds: [embed], components: [botoes] });

    await interaction.reply({
      content: `✅ Processo criado: ${canal}`,
      ephemeral: true
    });
  }
});

client.login(process.env.TOKEN);
