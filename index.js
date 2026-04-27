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
    .setDescription("Abrir sistema de tribunal RP")
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
// LOG
// =====================
async function log(guild, msg) {
  let channel = guild.channels.cache.find(c => c.name === "📜-logs");

  if (!channel) {
    channel = await guild.channels.create({
      name: "📜-logs",
      type: ChannelType.GuildText
    });
  }

  channel.send(msg);
}

// =====================
// INTERAÇÕES
// =====================
client.on("interactionCreate", async (interaction) => {

  try {

    // =====================
    // PAINEL
    // =====================
    if (interaction.isChatInputCommand()) {

      if (interaction.commandName === "painel-investigacao") {

        const embed = new EmbedBuilder()
          .setTitle("🔍⚖️ TRIBUNAL RP ⚖️🔍")
          .setColor("Gold")
          .setDescription(`
🏛️ Sistema Judicial Ativo

✔ Processos criminais  
✔ Audiências RP  
✔ Juiz, Advogado e Acusação  

━━━━━━━━━━━━━━

📌 Fluxo:
1 Criar processo  
2 Análise  
3 Audiência  
4 Sentença  
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
    // ABRIR MODAL (SEM REPLY → CORRETO)
    // =====================
    if (interaction.isButton() && interaction.customId === "abrir_form") {

      const modal = new ModalBuilder()
        .setCustomId("form_processo")
        .setTitle("📂 Novo Processo");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("solicitante")
            .setLabel("Nome do solicitante")
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
            .setLabel("Motivo detalhado")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }

    // =====================
    // CRIAR PROCESSO
    // =====================
    if (interaction.isModalSubmit()) {

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
          { name: "Status", value: "🟡 Em análise" }
        );

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("aud_inicio").setLabel("⚖️ Iniciar Audiência").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("encerrar").setLabel("🔒 Encerrar").setStyle(ButtonStyle.Danger)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("advogado").setLabel("👨‍💼 Advogado").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("acusacao").setLabel("👮 Acusação").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("falar").setLabel("🗣️ Falar").setStyle(ButtonStyle.Secondary)
      );

      await canal.send({ embeds: [embed], components: [row1, row2] });

      await canal.send("📎 Provas devem ser enviadas aqui.");

      await log(interaction.guild, `📂 Processo ${id} criado`);

      return interaction.reply({
        content: `✔ Processo criado: ${canal}`,
        flags: 64
      });
    }

    // =====================
    // BOTÕES AUDIÊNCIA
    // =====================
    if (interaction.isButton()) {

      const a = audiencias.get(interaction.channel.id);

      // ⚖️ INICIAR AUDIÊNCIA
      if (interaction.customId === "aud_inicio") {

        audiencias.set(interaction.channel.id, {
          juiz: interaction.user.id,
          advogado: null,
          acusacao: null,
          turno: "advogado",
          ativa: true
        });

        await interaction.channel.send("⚖️ AUDIÊNCIA INICIADA PELO JUIZ");

        return interaction.reply({ content: "✔ Audiência iniciada", flags: 64 });
      }

      // 👨‍💼 ADVOGADO
      if (interaction.customId === "advogado") {

        if (!a) return interaction.reply({ content: "❌ Sem audiência", flags: 64 });
        if (a.advogado) return interaction.reply({ content: "❌ Já existe advogado", flags: 64 });

        a.advogado = interaction.user.id;

        await interaction.channel.send(`👨‍💼 Advogado: <@${interaction.user.id}>`);

        return interaction.reply({ content: "✔ Você entrou como advogado", flags: 64 });
      }

      // 👮 ACUSAÇÃO
      if (interaction.customId === "acusacao") {

        if (!a) return interaction.reply({ content: "❌ Sem audiência", flags: 64 });
        if (a.acusacao) return interaction.reply({ content: "❌ Já existe acusação", flags: 64 });

        a.acusacao = interaction.user.id;

        await interaction.channel.send(`👮 Acusação: <@${interaction.user.id}>`);

        return interaction.reply({ content: "✔ Você entrou como acusação", flags: 64 });
      }

      // 🗣️ FALAR
      if (interaction.customId === "falar") {

        if (!a) return interaction.reply({ content: "❌ Sem audiência", flags: 64 });

        await interaction.channel.send(`🗣️ FALA: <@${interaction.user.id}>`);

        return interaction.reply({ content: "✔ Fala registrada", flags: 64 });
      }

      // 🔒 ENCERRAR
      if (interaction.customId === "encerrar") {

        audiencias.delete(interaction.channel.id);

        await interaction.channel.send("🔒 PROCESSO ENCERRADO PELO JUIZ");

        await log(interaction.guild, "⚫ Processo encerrado");

        return interaction.reply({ content: "✔ Encerrado", flags: 64 });
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
