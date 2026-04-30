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

const CAT_CIVIL = "INVESTIGACOES CIVIL";
const CAT_FEDERAL = "INVESTIGACOES FEDERAL";

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

👨‍⚖️ Nenhuma investigação sem autorização.

📌 Obrigatório:
• Solicitante
• ID
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
          new TextInputBuilder().setCustomId("solicitante_nome").setLabel("Nome do Solicitante").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("solicitante_id").setLabel("ID do Solicitante").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("alvo").setLabel("Pessoa / Facção").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("motivo").setLabel("Motivo").setStyle(TextInputStyle.Paragraph)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("provas").setLabel("Provas (link)").setStyle(TextInputStyle.Short)
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

      const nomeCategoria = tipo === "civil" ? CAT_CIVIL : CAT_FEDERAL;

      let categoria = interaction.guild.channels.cache.find(
        c => c.name === nomeCategoria && c.type === ChannelType.GuildCategory
      );

      if (!categoria) {
        categoria = await interaction.guild.channels.create({
          name: nomeCategoria,
          type: ChannelType.GuildCategory,
          permissionOverwrites: [
            { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
            { id: CARGO_JUIZ, allow: [PermissionsBitField.Flags.ViewChannel] },
            tipo === "civil"
              ? { id: POLICIA_CIVIL, allow: [PermissionsBitField.Flags.ViewChannel] }
              : { id: POLICIA_FEDERAL, allow: [PermissionsBitField.Flags.ViewChannel] }
          ]
        });
      }

      const canal = await interaction.guild.channels.create({
        name: `🔍-${tipo}-${id}-${interaction.user.username}`,
        type: ChannelType.GuildText,
        parent: categoria.id,
        lockPermissions: true
      });

      const msg = await canal.send({ embeds: [gerarEmbed(id, data)] });

      processos.set(canal.id, { ...data, msgId: msg.id, id });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("aprovar").setLabel("✔ Autorizar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("negar").setLabel("❌ Negar").setStyle(ButtonStyle.Danger),
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
        await interaction.channel.send(`✔ Aprovado por ${juiz}`);
      }

      if (interaction.customId === "negar") {
        p.status = "Negado";
        await interaction.channel.send(`❌ Negado por ${juiz}`);
      }

      if (interaction.customId === "encerrar") {

        p.status = "Encerrado";

        // 🔒 BLOQUEIO TOTAL
        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          SendMessages: false,
          AddReactions: false
        });

        await interaction.channel.permissionOverwrites.edit(POLICIA_CIVIL, {
          SendMessages: false
        });

        await interaction.channel.permissionOverwrites.edit(POLICIA_FEDERAL, {
          SendMessages: false
        });

        // ✅ Juiz mantém acesso
        await interaction.channel.permissionOverwrites.edit(CARGO_JUIZ, {
          SendMessages: true,
          ViewChannel: true
        });

        await interaction.channel.send(`🔒 Encerrado por ${juiz}\nApenas o juiz pode falar.`);

        processos.delete(interaction.channel.id);

        return interaction.reply({ content: "✔ Investigação encerrada.", ephemeral: true });
      }

      const msg = await interaction.channel.messages.fetch(p.msgId);
      await msg.edit({ embeds: [gerarEmbed(p.id, p)] });

      return interaction.reply({ content: "✔ Atualizado.", ephemeral: true });
    }

  } catch (err) {
    console.error(err);
  }
});

/* ================= START ================= */

await registerCommands();
client.login(TOKEN);
