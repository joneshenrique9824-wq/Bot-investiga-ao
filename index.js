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

/* ================= COMANDO ================= */

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("investigacao")
      .setDescription("Abrir painel policial")
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
        .setDescription("Acesso exclusivo da Polícia Civil e Federal.")
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
  console.log("🚔 Sistema policial online");
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

    /* ABRIR MODAL */
    if (interaction.isButton() && interaction.customId === "abrir") {

      if (
        !interaction.member.roles.cache.has(POLICIA_CIVIL) &&
        !interaction.member.roles.cache.has(POLICIA_FEDERAL)
      ) {
        return interaction.reply({
          content: "❌ Apenas Polícia.",
          ephemeral: true
        });
      }

      const modal = new ModalBuilder()
        .setCustomId("form")
        .setTitle("📂 Solicitação de Investigação");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("solicitante").setLabel("Seu Nome / ID").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("alvo").setLabel("Alvo Nome / ID").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("motivo").setLabel("Motivo").setStyle(TextInputStyle.Paragraph)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("provas").setLabel("Link das Provas").setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    /* CRIAR CANAL */
    if (interaction.isModalSubmit() && interaction.customId === "form") {

      const id = String(++contador).padStart(4, "0");

      const solicitante = interaction.fields.getTextInputValue("solicitante");
      const alvo = interaction.fields.getTextInputValue("alvo");
      const motivo = interaction.fields.getTextInputValue("motivo");
      const provas = interaction.fields.getTextInputValue("provas");

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
        name: `🔍-investigacao-${id}`,
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

      const embed = new EmbedBuilder()
        .setTitle(`🔍 INVESTIGAÇÃO #${id}`)
        .setColor("#f1c40f")
        .setDescription(`
👤 ${solicitante}

🎯 ${alvo}

📄 ${motivo}

📎 ${provas}

📊 Status: Aguardando decisão judicial
        `);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("aprovar").setLabel("✔ Autorizar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("negar").setLabel("❌ Negar").setStyle(ButtonStyle.Danger)
      );

      await canal.send({ embeds: [embed], components: [row] });

      processos.set(canal.id, true);

      return interaction.reply({ content: `✔ Investigação criada: ${canal}`, ephemeral: true });
    }

    /* BOTÕES DO JUIZ */
    if (interaction.isButton()) {

      if (!processos.has(interaction.channel.id)) return;

      if (!interaction.member.roles.cache.has(CARGO_JUIZ)) {
        return interaction.reply({ content: "❌ Apenas juiz.", ephemeral: true });
      }

      if (interaction.customId === "aprovar") {
        await interaction.channel.send("✔ AUTORIZAÇÃO DEFERIDA pelo juiz.");
        return interaction.reply({ content: "✔ Aprovado.", ephemeral: true });
      }

      if (interaction.customId === "negar") {
        await interaction.channel.send("❌ AUTORIZAÇÃO INDEFERIDA pelo juiz.");
        return interaction.reply({ content: "✔ Negado.", ephemeral: true });
      }
    }

  } catch (err) {
    console.error(err);
  }
});

/* ================= START ================= */

await registerCommands();
client.login(TOKEN);
