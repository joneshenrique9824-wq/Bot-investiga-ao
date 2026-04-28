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

/* ================= CONFIG ================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const CARGO_JUIZ = "1498346869988921505";
const POLICIA_CIVIL = "1498708612300669048";
const POLICIA_FEDERAL = "1498708690390355988";

const CATEGORIA = "INVESTIGACOES";

/* ================= CLIENT ================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let contador = 0;
const processos = new Map();

/* ================= FUNÇÃO TEMPO ================= */

function formatTempo(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  return `${h}h ${m}m ${s}s`;
}

/* ================= EMBED DINÂMICO ================= */

function gerarEmbed(id, data) {
  return new EmbedBuilder()
    .setTitle(`🔍 INVESTIGAÇÃO #${id}`)
    .setColor("#f1c40f")
    .setDescription(`
👤 ${data.solicitante}
🎯 ${data.alvo}

📄 ${data.motivo}

📎 ${data.provas}

📊 Status: ${data.status}
⏱️ Tempo: ${formatTempo(Date.now() - data.inicio)}
    `);
}

/* ================= COMANDO ================= */

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("investigacao")
      .setDescription("Abrir painel RP máximo")
  ].map(c => c.toJSON());

  const rest = new REST({ version: "10" }).setToken(TOKEN);

  await rest.put(
    Routes.applicationGuildCommands(CLIENT_ID, GUILD_ID),
    { body: commands }
  );
}

/* ================= PAINEL ================= */

function painel() {
  return {
    embeds: [
      new EmbedBuilder()
        .setTitle("🔍⚖️ AUTORIZAÇÃO DE INVESTIGAÇÃO ⚖️🔍")
        .setColor("#d4af37")
        .setDescription(`
🏛️ SISTEMA JUDICIAL RP

👨‍⚖️ Nenhuma investigação sem autorização.

📌 Obrigatório:
• Solicitante
• Alvo
• Motivo
• Provas
        `)
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("abrir")
          .setLabel("📂 Solicitar Investigação")
          .setStyle(ButtonStyle.Primary)
      )
    ]
  };
}

/* ================= READY ================= */

client.once("clientReady", () => {
  console.log("🚨 SISTEMA MÁXIMO ONLINE");
});

/* ================= INTERAÇÃO ================= */

client.on("interactionCreate", async (interaction) => {
  try {

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "investigacao") {
        return interaction.reply(painel());
      }
    }

    if (interaction.isButton() && interaction.customId === "abrir") {

      if (
        !interaction.member.roles.cache.has(POLICIA_CIVIL) &&
        !interaction.member.roles.cache.has(POLICIA_FEDERAL)
      ) {
        return interaction.reply({ content: "❌ Apenas polícia.", ephemeral: true });
      }

      const modal = new ModalBuilder()
        .setCustomId("form")
        .setTitle("📂 Investigação");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("solicitante").setLabel("Seu nome/ID").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("alvo").setLabel("Alvo").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("motivo").setLabel("Motivo").setStyle(TextInputStyle.Paragraph)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("provas").setLabel("Link/Imagem").setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId === "form") {

      const id = String(++contador).padStart(4, "0");

      const data = {
        solicitante: interaction.fields.getTextInputValue("solicitante"),
        alvo: interaction.fields.getTextInputValue("alvo"),
        motivo: interaction.fields.getTextInputValue("motivo"),
        provas: interaction.fields.getTextInputValue("provas"),
        status: "Aguardando",
        inicio: Date.now(),
        logs: []
      };

      let categoria = interaction.guild.channels.cache.find(
        c => c.name === CATEGORIA && c.type === ChannelType.GuildCategory
      );

      if (!categoria) {
        categoria = await interaction.guild.channels.create({
          name: CATEGORIA,
          type: ChannelType.GuildCategory
        });
      }

      const canal = await interaction.guild.channels.create({
        name: `🔍-${id}`,
        type: ChannelType.GuildText,
        parent: categoria.id,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: CARGO_JUIZ, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: POLICIA_CIVIL, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: POLICIA_FEDERAL, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      const msg = await canal.send({
        embeds: [gerarEmbed(id, data)]
      });

      processos.set(canal.id, { ...data, msgId: msg.id, id });

      const botoes = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("aprovar").setLabel("✔").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("negar").setLabel("❌").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("pausar").setLabel("⏸️").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("retomar").setLabel("▶️").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("encerrar").setLabel("🔒").setStyle(ButtonStyle.Secondary)
      );

      await canal.send({ components: [botoes] });

      return interaction.reply({ content: `✔ Criado: ${canal}`, ephemeral: true });
    }

    if (interaction.isButton()) {

      const p = processos.get(interaction.channel.id);
      if (!p) return;

      if (!interaction.member.roles.cache.has(CARGO_JUIZ)) {
        return interaction.reply({ content: "❌ Apenas juiz.", ephemeral: true });
      }

      if (interaction.customId === "aprovar") p.status = "Em andamento";
      if (interaction.customId === "negar") p.status = "Negado";
      if (interaction.customId === "pausar") p.status = "Pausado";
      if (interaction.customId === "retomar") p.status = "Em andamento";

      if (interaction.customId === "encerrar") {
        await interaction.channel.send("📁 RELATÓRIO FINAL:");
        await interaction.channel.send(JSON.stringify(p.logs, null, 2));
        processos.delete(interaction.channel.id);
        return interaction.reply({ content: "✔ Encerrado", ephemeral: true });
      }

      const msg = await interaction.channel.messages.fetch(p.msgId);
      await msg.edit({ embeds: [gerarEmbed(p.id, p)] });

      p.logs.push(`${interaction.customId} - ${interaction.user.username}`);

      return interaction.reply({ content: "✔ Atualizado", ephemeral: true });
    }

  } catch (err) {
    console.error(err);
  }
});

/* ================= START ================= */

await registerCommands();
client.login(TOKEN);
