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
  ChannelType
} from "discord.js";

/* ================= CONFIG ================= */

const TOKEN = process.env.TOKEN;
const CLIENT_ID = process.env.CLIENT_ID;
const GUILD_ID = process.env.GUILD_ID;

const CARGO_JUIZ = "1497405730414661642";
const POLICIA_CIVIL = "1498747886165426246";
const POLICIA_FEDERAL = "1498747892465270824";

const CAT_CIVIL = "INVESTIGACOES CIVIL";
const CAT_FEDERAL = "INVESTIGACOES FEDERAL";
const CAT_LOGS = "📁 LOGS INVESTIGAÇÃO";

/* ================= CLIENT ================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let contador = 0;
const processos = new Map();

/* ================= TEMPO ================= */

function formatTempo(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  return `${h}h ${m}m ${s}s`;
}

/* ================= LOCK HARD ================= */

async function lockChannel(channel) {
  const roles = channel.guild.roles.cache;

  for (const role of roles.values()) {
    await channel.permissionOverwrites.edit(role.id, {
      SendMessages: false
    });
  }
}

/* ================= EMBED ================= */

function gerarEmbed(id, data) {
  return new EmbedBuilder()
    .setTitle(`🔍 INVESTIGAÇÃO #${id}`)
    .setColor("#f1c40f")
    .setDescription(`
👮 Criado por: <@${data.criador}>
👤 ${data.solicitante_nome} | ID: ${data.solicitante_id}
🎯 ${data.alvo}
📄 ${data.motivo}
📎 ${data.provas}

🕵️ Infiltrado: ${
      data.infiltrado
        ? `${data.infiltrado.nome} (${data.infiltrado.passaporte})`
        : "Não definido"
    }

📊 Status: ${data.status}
⏱️ Tempo: ${formatTempo(Date.now() - data.inicio)}
`);
}

/* ================= COMANDO ================= */

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("investigacao")
      .setDescription("Abrir painel de investigação")
  ].map(c => c.toJSON());

  const rest = new REST({ version: 10 }).setToken(TOKEN);

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

👨‍⚖️ Nenhuma investigação pode ser iniciada sem autorização judicial.

📌 Informações obrigatórias:
• Nome do solicitante
• ID do solicitante
• Alvo da investigação
• Motivo detalhado
• Provas (links/imagens)
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
  console.log("🚨 Sistema Investigação RP ONLINE");
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async (interaction) => {
  try {

    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "investigacao") {
        return interaction.reply(painel());
      }
    }

    if (interaction.isButton() && interaction.customId === "abrir") {

      let tipo = null;

      if (interaction.member.roles.cache.has(POLICIA_CIVIL)) tipo = "civil";
      else if (interaction.member.roles.cache.has(POLICIA_FEDERAL)) tipo = "federal";
      else return interaction.reply({ content: "❌ Apenas Polícia.", ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId(`form_${tipo}`)
        .setTitle("📂 Investigação");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("solicitante_nome").setLabel("Nome").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("solicitante_id").setLabel("ID").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("alvo").setLabel("Alvo").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("motivo").setLabel("Motivo").setStyle(TextInputStyle.Paragraph)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("provas").setLabel("Provas").setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    if (interaction.isModalSubmit() && interaction.customId.startsWith("form_")) {

      const tipo = interaction.customId.includes("civil") ? "civil" : "federal";
      const id = String(++contador).padStart(4, "0");

      const data = {
        criador: interaction.user.id,
        solicitante_nome: interaction.fields.getTextInputValue("solicitante_nome"),
        solicitante_id: interaction.fields.getTextInputValue("solicitante_id"),
        alvo: interaction.fields.getTextInputValue("alvo"),
        motivo: interaction.fields.getTextInputValue("motivo"),
        provas: interaction.fields.getTextInputValue("provas"),
        status: "Aguardando",
        inicio: Date.now(),
        infiltrado: null
      };

      const categoria = await interaction.guild.channels.create({
        name: tipo === "civil" ? CAT_CIVIL : CAT_FEDERAL,
        type: ChannelType.GuildCategory
      });

      const canal = await interaction.guild.channels.create({
        name: `🔍-${tipo}-${id}`,
        type: ChannelType.GuildText,
        parent: categoria.id
      });

      const msg = await canal.send({ embeds: [gerarEmbed(id, data)] });

      processos.set(canal.id, { ...data, msgId: msg.id, id });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("aprovar").setLabel("✔ Aprovar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("negar").setLabel("❌ Negar").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("infiltrado").setLabel("🕵️ Infiltrado").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("encerrar").setLabel("🔒 Encerrar").setStyle(ButtonStyle.Secondary)
      );

      await canal.send({ components: [row] });

      return interaction.reply({ content: `✔ Investigação criada: ${canal}`, ephemeral: true });
    }

    if (interaction.isButton()) {

      const p = processos.get(interaction.channel.id);
      if (!p) return;

      if (!interaction.member.roles.cache.has(CARGO_JUIZ)) {
        return interaction.reply({ content: "❌ Apenas Juiz.", ephemeral: true });
      }

      const juiz = `<@${interaction.user.id}>`;

      if (interaction.customId === "aprovar") {
        p.status = "Em andamento";
        await interaction.channel.send(`✔ Aprovado pelo juiz ${juiz}`);
      }

      if (interaction.customId === "negar") {
        p.status = "Negado";
        await interaction.channel.send(`❌ Negado pelo juiz ${juiz}`);
      }

      if (interaction.customId === "infiltrado") {
        const modal = new ModalBuilder()
          .setCustomId("set_infiltrado")
          .setTitle("🕵️ Infiltrado");

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("nome").setLabel("Nome").setStyle(TextInputStyle.Short)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder().setCustomId("passaporte").setLabel("Passaporte").setStyle(TextInputStyle.Short)
          )
        );

        return interaction.showModal(modal);
      }

      if (interaction.customId === "encerrar") {

        p.status = "Encerrado";

        await lockChannel(interaction.channel);

        await interaction.channel.send(`🔒 Investigação encerrada pelo juiz ${juiz}`);

        let logs = await interaction.guild.channels.create({
          name: CAT_LOGS,
          type: ChannelType.GuildCategory
        });

        const log = await interaction.guild.channels.create({
          name: `log-${p.id}`,
          type: ChannelType.GuildText,
          parent: logs.id
        });

        await log.send(`📁 Investigação ${p.id} encerrada por ${juiz}`);

        processos.delete(interaction.channel.id);

        return interaction.reply({ content: "✔ Encerrado e travado.", ephemeral: true });
      }

      const msg = await interaction.channel.messages.fetch(p.msgId);
      await msg.edit({ embeds: [gerarEmbed(p.id, p)] });

      return interaction.reply({ content: "✔ Atualizado.", ephemeral: true });
    }

    if (interaction.isModalSubmit() && interaction.customId === "set_infiltrado") {

      const p = processos.get(interaction.channel.id);
      if (!p) return;

      p.infiltrado = {
        nome: interaction.fields.getTextInputValue("nome"),
        passaporte: interaction.fields.getTextInputValue("passaporte")
      };

      const msg = await interaction.channel.messages.fetch(p.msgId);
      await msg.edit({ embeds: [gerarEmbed(p.id, p)] });

      return interaction.reply({ content: "✔ Infiltrado definido.", ephemeral: true });
    }

  } catch (err) {
    console.error(err);
  }
});

/* ================= START ================= */

await registerCommands();
client.login(TOKEN);
