import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  REST,
  Routes,
  SlashCommandBuilder,
  EmbedBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ChannelType,
  PermissionsBitField
} from "discord.js";

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* =========================
   CONFIGURAÇÕES
========================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

// ⚖️ CARGO DO JUIZ
const CARGO_JUIZ = "1498346869988921505";

/* =========================
   BANCO EM MEMÓRIA
========================= */

const audiencias = new Map();
let count = 0;
const cooldown = new Set();

/* =========================
   REGISTRO DE COMANDO
========================= */

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("painel-investigacao")
      .setDescription("Abrir sistema do tribunal")
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

/* =========================
   PAINEL
========================= */

function painel() {
  const embed = new EmbedBuilder()
    .setTitle("🔍⚖️ SISTEMA JUDICIAL ⚖️🔍")
    .setColor("#d4af37")
    .setDescription(`
🏛️ Tribunal Ativo

📌 Abra um processo judicial
⚖️ Aguarde análise do juiz
🔒 Processo seguro e monitorado
    `);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrir_processo")
      .setLabel("📂 Abrir Processo")
      .setStyle(ButtonStyle.Success)
  );

  return { embeds: [embed], components: [row] };
}

/* =========================
   HANDLER PRINCIPAL
========================= */

client.on("interactionCreate", async (interaction) => {
  try {

    /* =========================
       COMANDO
    ========================= */

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel-investigacao") {
        return interaction.reply(painel());
      }
    }

    /* =========================
       ABRIR PROCESSO (MODAL)
    ========================= */

    if (interaction.isButton() && interaction.customId === "abrir_processo") {

      if (cooldown.has(interaction.user.id)) {
        return interaction.reply({ content: "⏳ Aguarde...", ephemeral: true });
      }

      cooldown.add(interaction.user.id);
      setTimeout(() => cooldown.delete(interaction.user.id), 3000);

      const modal = new ModalBuilder()
        .setCustomId("form_processo")
        .setTitle("📂 Novo Processo");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("solicitante")
            .setLabel("Nome do Solicitante")
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("alvo")
            .setLabel("Nome do Alvo")
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("motivo")
            .setLabel("Motivo")
            .setStyle(TextInputStyle.Paragraph)
        )
      );

      return interaction.showModal(modal);
    }

    /* =========================
       CRIAR PROCESSO
    ========================= */

    if (interaction.isModalSubmit() && interaction.customId === "form_processo") {

      const id = String(++count).padStart(4, "0");

      const solicitante = interaction.fields.getTextInputValue("solicitante");
      const alvo = interaction.fields.getTextInputValue("alvo");
      const motivo = interaction.fields.getTextInputValue("motivo");

      const canal = await interaction.guild.channels.create({
        name: `processo-${id}`,
        type: ChannelType.GuildText,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
          },
          {
            id: CARGO_JUIZ,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
          }
        ]
      });

      audiencias.set(canal.id, {
        juiz: null,
        advogado: null,
        acusacao: null,
        ativo: true
      });

      const embed = new EmbedBuilder()
        .setTitle(`⚖️ PROCESSO #${id}`)
        .setColor("#f1c40f")
        .setDescription(`
👤 Solicitante: ${solicitante}
🎯 Alvo: ${alvo}

📄 Motivo:
${motivo}
        `);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("aud_inicio").setLabel("⚖️ Audiência").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("advogado").setLabel("👨‍💼 Advogado").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("acusacao").setLabel("👮 Acusação").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("defesa").setLabel("📜 Defesa").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("encerrar").setLabel("🔒 Encerrar").setStyle(ButtonStyle.Danger)
      );

      await canal.send({ embeds: [embed], components: [row] });

      return interaction.reply({
        content: `✔ Processo criado: ${canal}`,
        ephemeral: true
      });
    }

    /* =========================
       AUDIÊNCIA
    ========================= */

    const session = audiencias.get(interaction.channel?.id);

    if (interaction.isButton()) {

      // ⚖️ INICIAR AUDIÊNCIA
      if (interaction.customId === "aud_inicio") {
        if (!interaction.member.roles.cache.has(CARGO_JUIZ)) {
          return interaction.reply({ content: "❌ Apenas o Juiz pode iniciar.", ephemeral: true });
        }

        session.juiz = interaction.user.id;

        return interaction.reply({
          content: "⚖️ Audiência iniciada!",
          ephemeral: true
        });
      }

      // 👨‍💼 ADVOGADO
      if (interaction.customId === "advogado") {
        if (!session?.ativo) {
          return interaction.reply({ content: "❌ Sem audiência ativa.", ephemeral: true });
        }

        session.advogado = interaction.user.id;

        return interaction.reply({ content: "✔ Advogado registrado", ephemeral: true });
      }

      // 👮 ACUSAÇÃO
      if (interaction.customId === "acusacao") {
        if (!session?.ativo) {
          return interaction.reply({ content: "❌ Sem audiência ativa.", ephemeral: true });
        }

        session.acusacao = interaction.user.id;

        return interaction.reply({ content: "✔ Acusação registrada", ephemeral: true });
      }

      // 📜 DEFESA
      if (interaction.customId === "defesa") {

        const modal = new ModalBuilder()
          .setCustomId("defesa_modal")
          .setTitle("📜 Defesa");

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("texto")
              .setLabel("Escreva sua defesa")
              .setStyle(TextInputStyle.Paragraph)
          )
        );

        return interaction.showModal(modal);
      }

      // 🔒 ENCERRAR
      if (interaction.customId === "encerrar") {

        if (!interaction.member.roles.cache.has(CARGO_JUIZ)) {
          return interaction.reply({ content: "❌ Apenas o Juiz pode encerrar.", ephemeral: true });
        }

        audiencias.delete(interaction.channel.id);

        await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
          SendMessages: false,
          AddReactions: false
        });

        await interaction.channel.send("🔒 Processo encerrado pelo tribunal.");

        return interaction.reply({ content: "✔ Encerrado", ephemeral: true });
      }
    }

    /* =========================
       DEFESA MODAL
    ========================= */

    if (interaction.isModalSubmit() && interaction.customId === "defesa_modal") {

      const texto = interaction.fields.getTextInputValue("texto");

      const embed = new EmbedBuilder()
        .setTitle("📜 DEFESA")
        .setColor("#3498db")
        .setDescription(texto);

      await interaction.channel.send({ embeds: [embed] });

      return interaction.reply({ content: "✔ Defesa enviada", ephemeral: true });
    }

  } catch (err) {
    console.error(err);

    if (!interaction.replied) {
      return interaction.reply({
        content: "❌ Erro interno no sistema",
        ephemeral: true
      });
    }
  }
});

/* =========================
   START BOT
========================= */

client.once("ready", () => {
  console.log(`⚖️ Tribunal online: ${client.user.tag}`);
});

await registerCommands();
client.login(TOKEN);
