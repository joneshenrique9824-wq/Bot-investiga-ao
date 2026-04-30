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

/* ================= COMANDOS ================= */

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("investigacao")
      .setDescription("Abrir painel")
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
        .setTitle("🔍 Sistema de Investigação")
        .setColor("#d4af37")
        .setDescription("Clique abaixo para iniciar.")
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("abrir")
          .setLabel("📂 Abrir Investigação")
          .setStyle(ButtonStyle.Primary)
      )
    ]
  };
}

/* ================= READY ================= */

client.once("clientReady", () => {
  console.log("✅ Bot ONLINE");
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async (interaction) => {
  try {

    /* COMANDO */
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "investigacao") {
        return interaction.reply(painel());
      }
    }

    /* ABRIR */
    if (interaction.isButton() && interaction.customId === "abrir") {

      let tipo = null;

      if (interaction.member.roles.cache.has(POLICIA_CIVIL)) tipo = "civil";
      else if (interaction.member.roles.cache.has(POLICIA_FEDERAL)) tipo = "federal";
      else return interaction.reply({ content: "❌ Apenas polícia.", ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId(`form_${tipo}`)
        .setTitle("Nova Investigação");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("nome").setLabel("Nome").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("id").setLabel("ID").setStyle(TextInputStyle.Short)
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

    /* CRIAR INVESTIGAÇÃO */
    if (interaction.isModalSubmit()) {

      const tipo = interaction.customId.includes("civil") ? "civil" : "federal";
      const id = String(++contador).padStart(4, "0");

      const data = {
        criador: interaction.user.id,
        solicitante_nome: interaction.fields.getTextInputValue("nome"),
        solicitante_id: interaction.fields.getTextInputValue("id"),
        alvo: interaction.fields.getTextInputValue("alvo"),
        motivo: interaction.fields.getTextInputValue("motivo"),
        provas: interaction.fields.getTextInputValue("provas"),
        status: "Aguardando",
        inicio: Date.now(),
        infiltrado: null
      };

      const canal = await interaction.guild.channels.create({
        name: `invest-${id}`,
        type: ChannelType.GuildText
      });

      const msg = await canal.send({ embeds: [gerarEmbed(id, data)] });

      processos.set(canal.id, { ...data, msgId: msg.id, id });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("aprovar").setLabel("✔").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("negar").setLabel("❌").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("infiltrado").setLabel("🕵️").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("encerrar").setLabel("🔒").setStyle(ButtonStyle.Secondary)
      );

      await canal.send({ components: [row] });

      return interaction.reply({ content: `✔ Criado: ${canal}`, ephemeral: true });
    }

    /* BOTÕES */
    if (interaction.isButton()) {

      const p = processos.get(interaction.channel.id);
      if (!p) return;

      if (!interaction.member.roles.cache.has(CARGO_JUIZ)) {
        return interaction.reply({ content: "❌ Apenas juiz.", ephemeral: true });
      }

      if (interaction.customId === "infiltrado") {

        const modal = new ModalBuilder()
          .setCustomId("set_infiltrado")
          .setTitle("Definir Infiltrado");

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

      if (interaction.customId === "aprovar") p.status = "Em andamento";
      if (interaction.customId === "negar") p.status = "Negado";

      if (interaction.customId === "encerrar") {

        p.status = "Encerrado";

        await interaction.channel.permissionOverwrites.edit(interaction.guild.roles.everyone, {
          SendMessages: false
        });

        await interaction.channel.permissionOverwrites.edit(CARGO_JUIZ, {
          SendMessages: true
        });

        await interaction.channel.send("🔒 Investigação encerrada.");

        processos.delete(interaction.channel.id);

        return interaction.reply({ content: "Encerrado.", ephemeral: true });
      }

      const msg = await interaction.channel.messages.fetch(p.msgId);
      await msg.edit({ embeds: [gerarEmbed(p.id, p)] });

      return interaction.reply({ content: "✔ Atualizado.", ephemeral: true });
    }

    /* SALVAR INFILTRADO */
    if (interaction.isModalSubmit() && interaction.customId === "set_infiltrado") {

      const p = processos.get(interaction.channel.id);
      if (!p) return;

      p.infiltrado = {
        nome: interaction.fields.getTextInputValue("nome"),
        passaporte: interaction.fields.getTextInputValue("passaporte")
      };

      const msg = await interaction.channel.messages.fetch(p.msgId);
      await msg.edit({ embeds: [gerarEmbed(p.id, p)] });

      return interaction.reply({ content: "🕵️ Infiltrado definido!", ephemeral: true });
    }

  } catch (err) {
    console.error(err);
  }
});

/* ================= START ================= */

await registerCommands();
client.login(TOKEN);
