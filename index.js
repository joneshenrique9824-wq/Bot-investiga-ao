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

const CARGO_JUIZ = "1497405730414661642";
const POLICIA_CIVIL = "1498747886165426246";
const POLICIA_FEDERAL = "1498747892465270824";

const CATEGORIA_CIVIL = "1499245923354808380";
const CATEGORIA_FEDERAL = "1499345603723792476";
const CANAL_LOGS = "1499246091437342771";

/* ================= CLIENT ================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

let contador = 0;
const processos = new Map();

/* ================= ANTI CRASH ================= */

process.on("unhandledRejection", err => {
  console.error("❌ ERRO NÃO TRATADO:", err);
});

process.on("uncaughtException", err => {
  console.error("❌ CRASH:", err);
});

/* ================= LOG ================= */

async function enviarLog(guild, msg) {
  try {
    const canal = await guild.channels.fetch(CANAL_LOGS).catch(() => null);
    if (!canal) return console.error("❌ Canal de logs não encontrado");
    await canal.send(`📊 LOG:\n${msg}`);
  } catch (e) {
    console.error("Erro LOG:", e);
  }
}

/* ================= TEMPO ================= */

function formatTempo(ms) {
  const s = Math.floor(ms / 1000) % 60;
  const m = Math.floor(ms / 60000) % 60;
  const h = Math.floor(ms / 3600000);
  return `${h}h ${m}m ${s}s`;
}

/* ================= EMBED ================= */

function gerarEmbed(id, d) {
  return new EmbedBuilder()
    .setTitle(`🔍 INVESTIGAÇÃO #${id}`)
    .setColor("#f1c40f")
    .setDescription(
`👮 Criado por: <@${d.criador}>

👤 ${d.solicitante_nome} | ID: ${d.solicitante_id}
🎯 ${d.alvo}

📄 ${d.motivo}
📎 ${d.provas}

🕵️ Infiltrado: ${
d.infiltrado
  ? `${d.infiltrado.nome} (${d.infiltrado.passaporte})`
  : "Não definido"
}

📊 Status: ${d.status}
⏱️ Tempo: ${formatTempo(Date.now() - d.inicio)}`
    );
}

/* ================= COMANDOS ================= */

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
        .setDescription(
`🏛️ SISTEMA JUDICIAL RP

👨‍⚖️ Nenhuma investigação sem autorização.

📌 Obrigatório:
• Solicitante
• ID
• Alvo
• Motivo
• Provas`
        )
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

client.once("ready", () => {
  console.log("🚨 BOT INVESTIGAÇÃO ONLINE");
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async (i) => {
  try {

    if (i.isChatInputCommand() && i.commandName === "investigacao") {
      return i.reply(painel());
    }

    if (i.isButton() && i.customId === "abrir") {

      let tipo = null;

      if (i.member.roles.cache.has(POLICIA_CIVIL)) tipo = "civil";
      else if (i.member.roles.cache.has(POLICIA_FEDERAL)) tipo = "federal";
      else return i.reply({ content: "❌ Apenas Polícia", ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId(`form_${tipo}`)
        .setTitle("📂 Investigação");

      const campos = [
        ["solicitante_nome", "Nome", TextInputStyle.Short],
        ["solicitante_id", "ID", TextInputStyle.Short],
        ["alvo", "Alvo", TextInputStyle.Short],
        ["motivo", "Motivo", TextInputStyle.Paragraph],
        ["provas", "Provas", TextInputStyle.Short]
      ];

      campos.forEach(([id, label, style]) => {
        const input = new TextInputBuilder()
          .setCustomId(id)
          .setLabel(label)
          .setStyle(style)
          .setRequired(true);

        modal.addComponents(new ActionRowBuilder().addComponents(input));
      });

      return i.showModal(modal);
    }

    if (i.isModalSubmit() && i.customId.startsWith("form_")) {

      const tipo = i.customId.split("_")[1];
      const id = String(++contador).padStart(4, "0");

      const data = {
        criador: i.user.id,
        solicitante_nome: i.fields.getTextInputValue("solicitante_nome"),
        solicitante_id: i.fields.getTextInputValue("solicitante_id"),
        alvo: i.fields.getTextInputValue("alvo"),
        motivo: i.fields.getTextInputValue("motivo"),
        provas: i.fields.getTextInputValue("provas"),
        status: "Aguardando",
        inicio: Date.now(),
        infiltrado: null
      };

      const canal = await i.guild.channels.create({
        name: `🔍-${tipo}-${id}`,
        type: ChannelType.GuildText,
        parent: tipo === "civil" ? CATEGORIA_CIVIL : CATEGORIA_FEDERAL,
        permissionOverwrites: [
          {
            id: i.guild.roles.everyone,
            deny: [PermissionsBitField.Flags.ViewChannel]
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

      const msg = await canal.send({ embeds: [gerarEmbed(id, data)] });

      processos.set(canal.id, { ...data, msgId: msg.id, id });

      await canal.send({
        components: [
          new ActionRowBuilder().addComponents(
            new ButtonBuilder().setCustomId("aprovar").setLabel("✔ Autorizar").setStyle(ButtonStyle.Success),
            new ButtonBuilder().setCustomId("negar").setLabel("❌ Negar").setStyle(ButtonStyle.Danger),
            new ButtonBuilder().setCustomId(`infiltrado_${canal.id}`).setLabel("🕵️ Infiltrado").setStyle(ButtonStyle.Primary),
            new ButtonBuilder().setCustomId("encerrar").setLabel("🔒 Encerrar").setStyle(ButtonStyle.Secondary)
          )
        ]
      });

      await enviarLog(i.guild, `📂 Nova investigação ${id} criada`);

      return i.reply({ content: "✔ Investigação criada!", ephemeral: true });
    }

    if (i.isButton()) {

      const p = processos.get(i.channel.id);
      if (!p) return;

      if (!i.member.roles.cache.has(CARGO_JUIZ)) {
        return i.reply({ content: "❌ Apenas juiz.", ephemeral: true });
      }

      const juiz = `<@${i.user.id}>`;
      let statusMsg = null;

      if (i.customId === "aprovar") {
        p.status = "Em andamento";
        statusMsg = `✔ APROVADA pelo Juiz ${juiz}`;
      }

      if (i.customId === "negar") {
        p.status = "Negado";
        statusMsg = `❌ NEGADA pelo Juiz ${juiz}`;
      }

      if (i.customId === "encerrar") {
        p.status = "Encerrado";

        await i.channel.permissionOverwrites.set([
          {
            id: i.guild.roles.everyone,
            deny: Object.values(PermissionsBitField.Flags)
          }
        ]);

        processos.delete(i.channel.id);
        statusMsg = `🔒 ENCERRADO pelo Juiz ${juiz}`;
      }

      if (statusMsg) {
        await i.channel.send({ content: statusMsg });
      }

      const msg = await i.channel.messages.fetch(p.msgId);
      await msg.edit({ embeds: [gerarEmbed(p.id, p)] });

      return i.reply({ content: "✔ Atualizado.", ephemeral: true });
    }

  } catch (err) {
    console.error("ERRO GERAL:", err);
  }
});

/* ================= START ================= */

await registerCommands();
client.login(TOKEN);
