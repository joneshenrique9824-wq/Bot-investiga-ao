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

let processoCount = 0;
const audiencias = new Map();

// 📌 COMANDO
const commands = [
  new SlashCommandBuilder()
    .setName("painel-investigacao")
    .setDescription("Abrir painel judicial")
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

// 📜 LOG
async function log(guild, msg) {
  let channel = guild.channels.cache.find(c => c.name === "📜-logs-investigacao");

  if (!channel) {
    channel = await guild.channels.create({
      name: "📜-logs-investigacao",
      type: ChannelType.GuildText
    });
  }

  channel.send(msg);
}

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {

  try {

    // =========================
    // 📌 PAINEL
    // =========================
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel-investigacao") {

        const embed = new EmbedBuilder()
          .setTitle("🔍⚖️ AUTORIZAÇÃO DE INVESTIGAÇÃO")
          .setColor("Gold")
          .setDescription(`
🏛️ SISTEMA JUDICIAL ATIVO

✔ Processo com canal aberto  
✔ Prova obrigatória (enviada no chat)  
✔ Juiz responsável pelo julgamento  

⏳ Fluxo:
1 Registro  
2 Investigação  
3 Julgamento  
          `);

        const btn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("abrir_form")
            .setLabel("Abrir Processo")
            .setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({ embeds: [embed], components: [btn] });
      }
    }

    // =========================
    // 🔘 ABRIR MODAL
    // =========================
    if (interaction.isButton() && interaction.customId === "abrir_form") {

      const modal = new ModalBuilder()
        .setCustomId("form_investigacao")
        .setTitle("Novo Processo Judicial");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("nome")
            .setLabel("Nome do solicitante")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("id")
            .setLabel("ID do solicitante")
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
            .setCustomId("alvo_id")
            .setLabel("ID do alvo")
            .setStyle(TextInputStyle.Short)
            .setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("motivo")
            .setLabel("Motivo detalhado")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }

    // =========================
    // 📂 CRIA PROCESSO
    // =========================
    if (interaction.isModalSubmit()) {

      await interaction.deferReply({ ephemeral: true });

      const id = `#${String(++processoCount).padStart(4, "0")}`;

      const nome = interaction.fields.getTextInputValue("nome");
      const uid = interaction.fields.getTextInputValue("id");
      const alvo = interaction.fields.getTextInputValue("alvo");
      const alvo_id = interaction.fields.getTextInputValue("alvo_id");
      const motivo = interaction.fields.getTextInputValue("motivo");

      let cat = interaction.guild.channels.cache.find(c => c.name === "📂 INVESTIGAÇÕES");

      if (!cat) {
        cat = await interaction.guild.channels.create({
          name: "📂 INVESTIGAÇÕES",
          type: ChannelType.GuildCategory
        });
      }

      const canal = await interaction.guild.channels.create({
        name: `📂-${id}`,
        type: ChannelType.GuildText,
        parent: cat.id,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: process.env.CARGO_JUIZ, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      const embed = new EmbedBuilder()
        .setTitle(`📂 PROCESSO ${id}`)
        .setColor("Yellow")
        .addFields(
          { name: "👤 Solicitante", value: `${nome} (${uid})` },
          { name: "🎯 Alvo", value: `${alvo} (${alvo_id})` },
          { name: "📄 Motivo", value: motivo },
          { name: "📜 Status", value: "🟡 Em análise" }
        );

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("aprovar").setLabel("Aprovar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("negar").setLabel("Negar").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("encerrar").setLabel("Encerrar").setStyle(ButtonStyle.Secondary)
      );

      await canal.send({ embeds: [embed], components: [buttons] });

      // 🔥 PROVA AGORA NO CHAT (NÃO NO MODAL)
      await canal.send("📎 Envie aqui a PROVA INICIAL do caso.");

      await log(interaction.guild, `📂 Processo ${id} criado`);

      return interaction.editReply({
        content: `✔ Processo criado: ${canal}`
      });
    }

    // =========================
    // ⚖️ DECISÕES
    // =========================
    if (interaction.isButton()) {

      const embed = EmbedBuilder.from(interaction.message.embeds?.[0] || {});

      if (interaction.customId === "aprovar") {
        if (!interaction.member.roles.cache.has(process.env.CARGO_JUIZ))
          return interaction.reply({ content: "❌ Sem permissão", flags: 64 });

        embed.setColor("Green");
        await log(interaction.guild, "🟢 Processo aprovado");

        return interaction.update({ embeds: [embed], components: [] });
      }

      if (interaction.customId === "negar") {
        if (!interaction.member.roles.cache.has(process.env.CARGO_JUIZ))
          return interaction.reply({ content: "❌ Sem permissão", flags: 64 });

        embed.setColor("Red");
        await log(interaction.guild, "🔴 Processo negado");

        return interaction.update({ embeds: [embed], components: [] });
      }

      if (interaction.customId === "encerrar") {
        embed.setColor("Grey");
        await log(interaction.guild, "⚫ Processo encerrado");

        return interaction.update({ embeds: [embed], components: [] });
      }
    }

  } catch (err) {
    console.error("Erro geral:", err);

    if (!interaction.replied) {
      return interaction.reply({
        content: "❌ erro no sistema",
        flags: 64
      });
    }
  }
});

client.login(process.env.TOKEN);
