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

// 📡 REGISTRO
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

  // 📌 COMANDO
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painel-investigacao") {

      const embed = new EmbedBuilder()
        .setTitle("🔍⚖️ AUTORIZAÇÃO DE INVESTIGAÇÃO ⚖️🔍")
        .setDescription(`
👨‍⚖️ AUTORIDADE JUDICIAL:
Nenhuma investigação poderá ser iniciada sem a devida autorização do Juiz responsável.

📌 SOLICITAÇÃO DE INVESTIGAÇÃO:

Preencha corretamente o formulário abaixo para abertura do processo.

⚖️ O caso será analisado pelo tribunal antes de qualquer decisão.

📂 Apenas solicitações oficiais serão aceitas.
        `)
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

  // 🔘 BOTÃO
  if (interaction.isButton()) {

    if (interaction.customId === "abrir_form") {

      const modal = new ModalBuilder()
        .setCustomId("form_investigacao")
        .setTitle("📂 Abrir Processo de Investigação");

      modal.addComponents(

        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("solicitante_nome")
            .setLabel("👤 Nome do Solicitante")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),

        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("solicitante_id")
            .setLabel("🆔 ID do Solicitante")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),

        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("alvo_nome")
            .setLabel("🎯 Nome do Alvo")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),

        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("alvo_id")
            .setLabel("🆔 ID do Alvo")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),

        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("motivo")
            .setLabel("📄 Motivo da Investigação")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        ),

        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("provas")
            .setLabel("📎 Provas Iniciais")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }

    // 👮 ASSUMIR
    if (interaction.customId === "assumir") {

      const embed = EmbedBuilder.from(interaction.message.embeds[0]);
      const fields = embed.data.fields;

      if (fields[6].value !== "Ninguém") {
        return interaction.reply({ content: "❌ Já assumido", ephemeral: true });
      }

      fields[6].value = `<@${interaction.user.id}>`;
      fields[5].value += `\n• Assumido por <@${interaction.user.id}>`;

      embed.setFields(fields);

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
        log = "Juiz aprovou o caso";
        embed.setColor("Green");
      }

      if (interaction.customId === "negar") {
        status = "🔴 NEGADO";
        log = "Juiz negou o caso";
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

  // 📂 FORM
  if (interaction.isModalSubmit()) {

    const solicitante_nome = interaction.fields.getTextInputValue("solicitante_nome");
    const solicitante_id = interaction.fields.getTextInputValue("solicitante_id");
    const alvo_nome = interaction.fields.getTextInputValue("alvo_nome");
    const alvo_id = interaction.fields.getTextInputValue("alvo_id");
    const motivo = interaction.fields.getTextInputValue("motivo");
    const provas = interaction.fields.getTextInputValue("provas");

    let categoria = interaction.guild.channels.cache.find(c => c.name === "📂 INVESTIGAÇÕES");

    if (!categoria) {
      categoria = await interaction.guild.channels.create({
        name: "📂 INVESTIGAÇÕES",
        type: ChannelType.GuildCategory
      });
    }

    const canal = await interaction.guild.channels.create({
      name: `📂・${alvo_nome.toLowerCase().replace(/ /g, "-")}`,
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

    const embed = new EmbedBuilder()
      .setTitle("📂 PROCESSO DE INVESTIGAÇÃO")
      .setColor("Yellow")
      .addFields(
        { name: "👤 SOLICITANTE", value: `Nome: ${solicitante_nome}\nID: ${solicitante_id}` },
        { name: "🎯 ALVO", value: `Nome: ${alvo_nome}\nID: ${alvo_id}` },
        { name: "📄 MOTIVO", value: motivo },
        { name: "📎 PROVAS", value: provas },
        { name: "⏰ STATUS", value: "🟡 Em análise" },
        { name: "📜 LOGS", value: "• Processo criado" },
        { name: "👮 RESPONSÁVEL", value: "Ninguém" }
      );

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("assumir").setLabel("Assumir Caso").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("aprovar").setLabel("Aprovar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("negar").setLabel("Negar").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("encerrar").setLabel("Encerrar").setStyle(ButtonStyle.Secondary)
    );

    await canal.send({ embeds: [embed], components: [botoes] });

    return interaction.reply({
      content: `✅ Processo criado: ${canal}`,
      ephemeral: true
    });
  }
});

client.login(process.env.TOKEN);
