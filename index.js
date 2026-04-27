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

/* =========================
   CLIENTE
========================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

/* =========================
   CONFIG
========================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const CARGO_JUIZ = "1498346869988921505";

/* =========================
   MEMÓRIA (SEM DB)
========================= */

const processos = new Map();
let contador = 0;
const cooldown = new Set();

/* =========================
   REGISTRAR COMANDO
========================= */

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("tribunal")
      .setDescription("Abrir painel do Tribunal Elite Pro Max")
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

/* =========================
   PAINEL PRO MAX
========================= */

function painel() {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("⚖️ TRIBUNAL ELITE PRO MAX")
        .setColor("#d4af37")
        .setDescription(`
🏛️ Sistema Judicial de Alta Segurança

📂 Criação de processos automatizada
⚖️ Julgamento exclusivo por juízes
📜 Defesa e acusação organizadas
🔒 Controle total do tribunal
        `)
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("abrir_processo")
          .setLabel("📂 Abrir Processo")
          .setStyle(ButtonStyle.Success)
      )
    ]
  };
}

/* =========================
   START BOT
========================= */

client.once("ready", () => {
  console.log(`⚖️ Tribunal PRO MAX online: ${client.user.tag}`);
});

/* =========================
   INTERAÇÕES
========================= */

client.on("interactionCreate", async (interaction) => {
  try {

    /* ================= COMANDO ================= */
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "tribunal") {
        return interaction.reply(painel());
      }
    }

    /* ================= ABRIR PROCESSO ================= */
    if (interaction.isButton() && interaction.customId === "abrir_processo") {

      if (cooldown.has(interaction.user.id)) {
        return interaction.reply({ content: "⏳ Aguarde alguns segundos...", ephemeral: true });
      }

      cooldown.add(interaction.user.id);
      setTimeout(() => cooldown.delete(interaction.user.id), 3000);

      const modal = new ModalBuilder()
        .setCustomId("form_processo")
        .setTitle("📂 Novo Processo Judicial");

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
            .setLabel("Motivo do Processo")
            .setStyle(TextInputStyle.Paragraph)
        )
      );

      return interaction.showModal(modal);
    }

    /* ================= CRIAR PROCESSO ================= */
    if (interaction.isModalSubmit() && interaction.customId === "form_processo") {

      const id = String(++contador).padStart(4, "0");

      const solicitante = interaction.fields.getTextInputValue("solicitante");
      const alvo = interaction.fields.getTextInputValue("alvo");
      const motivo = interaction.fields.getTextInputValue("motivo");

      const canal = await interaction.guild.channels.create({
        name: `⚖️-processo-${id}`,
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

      processos.set(canal.id, {
        juiz: null,
        advogado: null,
        acusacao: null,
        status: "ativo"
      });

      const embed = new EmbedBuilder()
        .setTitle(`⚖️ PROCESSO PRO MAX #${id}`)
        .setColor("#f1c40f")
        .setDescription(`
👤 Solicitante: ${solicitante}
🎯 Alvo: ${alvo}

📄 Motivo:
${motivo}

━━━━━━━━━━━━━━━━
📌 Aguarde início da audiência
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

    /* ================= SESSION ================= */
    const session = processos.get(interaction.channel?.id);

    /* ================= BOTÕES ================= */
    if (interaction.isButton()) {

      // ⚖️ AUDIÊNCIA
      if (interaction.customId === "aud_inicio") {
        if (!interaction.member.roles.cache.has(CARGO_JUIZ)) {
          return interaction.reply({ content: "❌ Apenas o juiz pode iniciar.", ephemeral: true });
        }

        if (session) session.juiz = interaction.user.id;

        return interaction.reply({ content: "⚖️ Audiência iniciada com sucesso", ephemeral: true });
      }

      // 👨‍💼 ADVOGADO
      if (interaction.customId === "advogado") {
        if (!session?.status) {
          return interaction.reply({ content: "❌ Processo inválido", ephemeral: true });
        }

        session.advogado = interaction.user.id;

        return interaction.reply({ content: "✔ Advogado registrado", ephemeral: true });
      }

      // 👮 ACUSAÇÃO
      if (interaction.customId === "acusacao") {
        if (!session?.status) {
          return interaction.reply({ content: "❌ Processo inválido", ephemeral: true });
        }

        session.acusacao = interaction.user.id;

        return interaction.reply({ content: "✔ Acusação registrada", ephemeral: true });
      }

      // 🔒 ENCERRAR
      if (interaction.customId === "encerrar") {
        if (!interaction.member.roles.cache.has(CARGO_JUIZ)) {
          return interaction.reply({ content: "❌ Apenas o juiz pode encerrar.", ephemeral: true });
        }

        processos.delete(interaction.channel.id);

        await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
          SendMessages: false,
          AddReactions: false
        });

        await interaction.channel.send("🔒 Processo encerrado pelo Tribunal PRO MAX.");

        return interaction.reply({ content: "✔ Encerrado com sucesso", ephemeral: true });
      }

      // 📜 DEFESA
      if (interaction.customId === "defesa") {

        const modal = new ModalBuilder()
          .setCustomId("defesa_modal")
          .setTitle("📜 Defesa Oficial");

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
    }

    /* ================= DEFESA ================= */
    if (interaction.isModalSubmit() && interaction.customId === "defesa_modal") {

      const texto = interaction.fields.getTextInputValue("texto");

      const embed = new EmbedBuilder()
        .setTitle("📜 DEFESA OFICIAL")
        .setColor("#3498db")
        .setDescription(texto);

      await interaction.channel.send({ embeds: [embed] });

      return interaction.reply({ content: "✔ Defesa registrada com sucesso", ephemeral: true });
    }

  } catch (err) {
    console.error(err);

    if (!interaction.replied) {
      return interaction.reply({
        content: "❌ Erro interno no Tribunal PRO MAX",
        ephemeral: true
      });
    }
  }
});

/* =========================
   START
========================= */

await registerCommands();
client.login(TOKEN);
