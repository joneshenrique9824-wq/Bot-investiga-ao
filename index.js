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

if (!process.env.TOKEN) throw new Error("TOKEN não definido");
if (!process.env.CLIENT_ID) throw new Error("CLIENT_ID não definido");
if (!process.env.GUILD_ID) throw new Error("GUILD_ID não definido");
if (!process.env.CARGO_JUIZ) throw new Error("CARGO_JUIZ não definido");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

// 🧾 CONTROLE GLOBAL
let processoCount = 0;

// 📊 CANAL DE LOG (cria automaticamente depois)
let logChannelId = null;

// 📌 COMANDO
const commands = [
  new SlashCommandBuilder()
    .setName("painel-investigacao")
    .setDescription("Abrir painel de investigação")
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
})();

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} online`);
});

// 🧾 LOG FUNCTION
async function log(interaction, msg) {
  const guild = interaction.guild;

  let logChannel = guild.channels.cache.find(c => c.name === "📜-logs-investigacao");

  if (!logChannel) {
    logChannel = await guild.channels.create({
      name: "📜-logs-investigacao",
      type: ChannelType.GuildText
    });
    logChannelId = logChannel.id;
  }

  logChannel.send(`📌 ${msg}`);
}

client.on("interactionCreate", async (interaction) => {

  // 📌 PAINEL
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painel-investigacao") {

      const embed = new EmbedBuilder()
        .setTitle("🔍⚖️ AUTORIZAÇÃO DE INVESTIGAÇÃO ⚖️🔍")
        .setDescription(`
👨‍⚖️ AUTORIDADE JUDICIAL:
Nenhuma investigação poderá ser iniciada sem autorização do Juiz.

📂 Sistema de controle judicial ativo.

⚖️ Todos os processos são numerados e registrados.
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
        .setTitle("📂 Novo Processo Judicial");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("solicitante_nome").setLabel("Nome Solicitante").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("solicitante_id").setLabel("ID Solicitante").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("alvo_nome").setLabel("Nome Alvo").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("alvo_id").setLabel("ID Alvo").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("motivo").setLabel("Motivo").setStyle(TextInputStyle.Paragraph).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("provas").setLabel("Provas").setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }
  }

  // 📂 FORM
  if (interaction.isModalSubmit()) {

    processoCount++;
    const processoID = `#${String(processoCount).padStart(4, "0")}`;

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
      name: `📂・${processoID}`,
      type: ChannelType.GuildText,
      parent: categoria.id,
      permissionOverwrites: [
        { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
        { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
        { id: process.env.CARGO_JUIZ, allow: [PermissionsBitField.Flags.ViewChannel] }
      ]
    });

    const prazo = Date.now() + 48 * 60 * 60 * 1000;

    const embed = new EmbedBuilder()
      .setTitle(`📂 PROCESSO ${processoID}`)
      .setColor("Yellow")
      .addFields(
        { name: "👤 SOLICITANTE", value: `${solicitante_nome} (${solicitante_id})` },
        { name: "🎯 ALVO", value: `${alvo_nome} (${alvo_id})` },
        { name: "📄 MOTIVO", value: motivo },
        { name: "📎 PROVAS", value: provas },
        { name: "⏰ PRAZO", value: `<t:${Math.floor(prazo / 1000)}:R>` },
        { name: "📜 STATUS", value: "🟡 Em análise" },
        { name: "👮 RESPONSÁVEL", value: "Ninguém" },
        { name: "👨‍⚖️ ASSINATURA", value: "Aguardando Juiz" }
      );

    const botoes = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("assumir").setLabel("Assumir").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("aprovar").setLabel("Aprovar").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("negar").setLabel("Negar").setStyle(ButtonStyle.Danger),
      new ButtonBuilder().setCustomId("encerrar").setLabel("Encerrar").setStyle(ButtonStyle.Secondary)
    );

    await canal.send({ embeds: [embed], components: [botoes] });

    await log(interaction, `📂 Processo ${processoID} criado por ${interaction.user.tag}`);

    return interaction.reply({
      content: `✅ Processo criado: ${canal} | ID: ${processoID}`,
      ephemeral: true
    });
  }

  // ⚖️ DECISÕES + ASSINATURA
  if (interaction.isButton()) {

    const embed = EmbedBuilder.from(interaction.message.embeds[0]);

    if (interaction.customId === "aprovar") {
      if (!interaction.member.roles.cache.has(process.env.CARGO_JUIZ))
        return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });

      embed.setColor("Green");
      embed.addFields({ name: "👨‍⚖️ DECISÃO", value: `Autorização deferida por ${interaction.user.tag}` });

      await log(interaction, `🟢 Processo aprovado por ${interaction.user.tag}`);

      return interaction.update({ embeds: [embed], components: [] });
    }

    if (interaction.customId === "negar") {
      if (!interaction.member.roles.cache.has(process.env.CARGO_JUIZ))
        return interaction.reply({ content: "❌ Sem permissão", ephemeral: true });

      embed.setColor("Red");
      embed.addFields({ name: "👨‍⚖️ DECISÃO", value: `Autorização indeferida por ${interaction.user.tag}` });

      await log(interaction, `🔴 Processo negado por ${interaction.user.tag}`);

      return interaction.update({ embeds: [embed], components: [] });
    }

    if (interaction.customId === "encerrar") {
      embed.setColor("Grey");

      await log(interaction, `⚫ Processo encerrado por ${interaction.user.tag}`);

      return interaction.update({ embeds: [embed], components: [] });
    }
  }
});

client.login(process.env.TOKEN);
