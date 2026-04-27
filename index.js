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

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let processoCount = 0;
const audiencias = new Map();

// =====================
// COMANDO
// =====================
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

// =====================
// READY
// =====================
client.once("ready", () => {
  console.log(`⚖️ Tribunal online: ${client.user.tag}`);
});

// =====================
// INTERAÇÕES
// =====================
client.on("interactionCreate", async (interaction) => {

  try {

    // =====================
    // 📌 PAINEL
    // =====================
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel-investigacao") {

        const embed = new EmbedBuilder()
          .setTitle("🔍⚖️ AUTORIZAÇÃO DE INVESTIGAÇÃO ⚖️🔍")
          .setColor("Gold")
          .setDescription(`
👨‍⚖️ AUTORIDADE JUDICIAL:
Nenhuma investigação pode ser iniciada sem autorização.

━━━━━━━━━━━━━━━━━━━━━━

📌 REQUISITOS:
✔ Solicitante  
✔ Alvo  
✔ Motivo  
✔ Provas  

━━━━━━━━━━━━━━━━━━━━━━

⚖️ FLUXO:
1 Registro  
2 Análise  
3 Audiência  
4 Sentença  

━━━━━━━━━━━━━━━━━━━━━━

🏛️ Tribunal RP ativo
          `);

        const btn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("abrir_form")
            .setLabel("📂 Criar Processo")
            .setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({ embeds: [embed], components: [btn] });
      }
    }

    // =====================
    // 📂 ABRIR MODAL
    // =====================
    if (interaction.isButton() && interaction.customId === "abrir_form") {

      await interaction.reply({
        content: "📂 Abrindo formulário de processo...",
        flags: 64
      });

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

    // =====================
    // 📂 CRIAR PROCESSO
    // =====================
    if (interaction.isModalSubmit()) {

      await interaction.deferReply({ flags: 64 });

      const id = `#${String(++processoCount).padStart(4, "0")}`;

      const solicitante = interaction.fields.getTextInputValue("solicitante");
      const alvo = interaction.fields.getTextInputValue("alvo");
      const motivo = interaction.fields.getTextInputValue("motivo");

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

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("prova").setLabel("📎 Prova").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("audiencia").setLabel("⚖️ Audiência").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("encerrar").setLabel("🔒 Encerrar").setStyle(ButtonStyle.Danger)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("advogado").setLabel("👨‍💼 Advogado").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("acusacao").setLabel("👮 Acusação").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("falar").setLabel("🗣️ Falar").setStyle(ButtonStyle.Primary)
      );

      await canal.send({ embeds: [embed], components: [row1, row2] });

      await canal.send("📎 Envie a PROVA inicial aqui no chat.");

      return interaction.editReply({
        content: `✔ Processo criado: ${canal}`
      });
    }

    // =====================
    // ⚖️ BOTÕES (TODOS)
    // =====================
    if (interaction.isButton()) {

      const id = interaction.customId;

      // 📎 PROVA
      if (id === "prova") {
        return interaction.reply({
          content: "📎 Envie a prova no chat do processo.",
          flags: 64
        });
      }

      // ⚖️ AUDIÊNCIA
      if (id === "audiencia") {
        audiencias.set(interaction.channel.id, {
          juiz: interaction.user.id,
          advogado: null,
          acusacao: null,
          turno: "advogado",
          ativa: true
        });

        await interaction.channel.send("⚖️ AUDIÊNCIA INICIADA PELO JUIZ");

        return interaction.reply({
          content: "✔ Audiência iniciada",
          flags: 64
        });
      }

      // 👨‍💼 ADVOGADO
      if (id === "advogado") {
        const a = audiencias.get(interaction.channel.id);
        if (!a) return interaction.reply({ content: "❌ Sem audiência", flags: 64 });

        a.advogado = interaction.user.id;

        await interaction.channel.send(`👨‍💼 Advogado entrou: <@${interaction.user.id}>`);

        return interaction.reply({
          content: "✔ Você entrou como advogado",
          flags: 64
        });
      }

      // 👮 ACUSAÇÃO
      if (id === "acusacao") {
        const a = audiencias.get(interaction.channel.id);
        if (!a) return interaction.reply({ content: "❌ Sem audiência", flags: 64 });

        a.acusacao = interaction.user.id;

        await interaction.channel.send(`👮 Acusação entrou: <@${interaction.user.id}>`);

        return interaction.reply({
          content: "✔ Você entrou como acusação",
          flags: 64
        });
      }

      // 🗣️ FALAR
      if (id === "falar") {
        const a = audiencias.get(interaction.channel.id);
        if (!a) return interaction.reply({ content: "❌ Sem audiência", flags: 64 });

        await interaction.channel.send(`🗣️ FALA REGISTRADA: <@${interaction.user.id}>`);

        return interaction.reply({
          content: "✔ Fala registrada",
          flags: 64
        });
      }

      // 🔒 ENCERRAR
      if (id === "encerrar") {
        audiencias.delete(interaction.channel.id);

        await interaction.channel.send("🔒 PROCESSO ENCERRADO PELO JUIZ");

        return interaction.reply({
          content: "✔ Encerrado",
          flags: 64
        });
      }
    }

  } catch (err) {
    console.error(err);

    if (!interaction.replied) {
      return interaction.reply({
        content: "❌ erro no sistema",
        flags: 64
      });
    }
  }
});

client.login(process.env.TOKEN);
