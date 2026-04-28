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
const CATEGORIA_PAINEL = "1498359349318258789"; // categoria
const CATEGORIA_PROCESSOS = "TRIBUNAL JURIDICO BELLA";

/* ================= CLIENT ================= */

const client = new Client({
  intents: [GatewayIntentBits.Guilds]
});

const processos = new Map();
let contador = 0;
const cooldown = new Set();

/* ================= COMANDO ================= */

async function registerCommands() {
  const commands = [
    new SlashCommandBuilder()
      .setName("tribunal")
      .setDescription("Enviar painel do Jurídico Bella")
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
        .setDescription("Clique abaixo para solicitar uma investigação.")
    ],
    components: [
      new ActionRowBuilder().addComponents(
        new ButtonBuilder()
          .setCustomId("abrir_processo")
          .setLabel("📂 Solicitar Investigação")
          .setStyle(ButtonStyle.Primary)
      )
    ]
  };
}

/* ================= READY ================= */

client.once("clientReady", () => {
  console.log("⚖️ Jurídico Bella online");
});

/* ================= INTERAÇÕES ================= */

client.on("interactionCreate", async (interaction) => {
  try {

    /* COMANDO */
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "tribunal") {

        const categoria = await interaction.guild.channels.fetch(CATEGORIA_PAINEL).catch(() => null);

        if (!categoria || categoria.type !== ChannelType.GuildCategory) {
          return interaction.reply({
            content: "❌ Categoria inválida.",
            ephemeral: true
          });
        }

        let canal = interaction.guild.channels.cache.find(
          c => c.name === "📌・painel-investigacao" && c.parentId === categoria.id
        );

        if (!canal) {
          canal = await interaction.guild.channels.create({
            name: "📌・painel-investigacao",
            type: ChannelType.GuildText,
            parent: categoria.id
          });
        }

        await canal.send(painel());

        return interaction.reply({
          content: `✔ Painel enviado em ${canal}`,
          ephemeral: true
        });
      }
    }

    /* ABRIR MODAL */
    if (interaction.isButton() && interaction.customId === "abrir_processo") {

      if (cooldown.has(interaction.user.id)) {
        return interaction.reply({ content: "⏳ Aguarde...", ephemeral: true });
      }

      cooldown.add(interaction.user.id);
      setTimeout(() => cooldown.delete(interaction.user.id), 3000);

      const modal = new ModalBuilder()
        .setCustomId("modal_processo")
        .setTitle("📂 Solicitação");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("solicitante").setLabel("Seu nome").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("alvo").setLabel("Nome do alvo").setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("motivo").setLabel("Motivo").setStyle(TextInputStyle.Paragraph)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("provas").setLabel("Link das provas").setStyle(TextInputStyle.Short)
        )
      );

      return interaction.showModal(modal);
    }

    /* CRIAR PROCESSO */
    if (interaction.isModalSubmit() && interaction.customId === "modal_processo") {

      const id = String(++contador).padStart(4, "0");

      const solicitante = interaction.fields.getTextInputValue("solicitante");
      const alvo = interaction.fields.getTextInputValue("alvo");
      const motivo = interaction.fields.getTextInputValue("motivo");
      const provas = interaction.fields.getTextInputValue("provas");

      let categoria = interaction.guild.channels.cache.find(
        c => c.name === CATEGORIA_PROCESSOS && c.type === ChannelType.GuildCategory
      );

      if (!categoria) {
        categoria = await interaction.guild.channels.create({
          name: CATEGORIA_PROCESSOS,
          type: ChannelType.GuildCategory
        });
      }

      const canal = await interaction.guild.channels.create({
        name: `📂-processo-${id}`,
        type: ChannelType.GuildText,
        parent: categoria.id,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] },
          { id: CARGO_JUIZ, allow: [PermissionsBitField.Flags.ViewChannel, PermissionsBitField.Flags.SendMessages] }
        ]
      });

      processos.set(canal.id, { status: "Aguardando" });

      const embed = new EmbedBuilder()
        .setTitle(`📂 PROCESSO #${id}`)
        .setColor("#f1c40f")
        .setDescription(`
👤 ${solicitante}
🎯 ${alvo}

📄 ${motivo}

📎 ${provas}

📊 Status: Aguardando juiz
        `);

      const row1 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("aprovar").setLabel("✔ Aprovar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("recusar").setLabel("❌ Recusar").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("defesa").setLabel("📜 Defesa").setStyle(ButtonStyle.Secondary)
      );

      const row2 = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("encerrar").setLabel("🔒 Encerrar").setStyle(ButtonStyle.Secondary)
      );

      await canal.send({ embeds: [embed], components: [row1, row2] });

      return interaction.reply({ content: `✔ Processo criado: ${canal}`, ephemeral: true });
    }

    const session = processos.get(interaction.channel?.id);

    /* BOTÕES */
    if (interaction.isButton()) {

      if (!session) return;

      if (["aprovar", "recusar", "encerrar"].includes(interaction.customId)) {
        if (!interaction.member.roles.cache.has(CARGO_JUIZ)) {
          return interaction.reply({ content: "❌ Apenas juiz.", ephemeral: true });
        }
      }

      if (interaction.customId === "aprovar") {
        session.status = "Aprovado";
        await interaction.channel.send("✔ APROVADO pelo juiz.");
        return interaction.reply({ content: "✔ Aprovado.", ephemeral: true });
      }

      if (interaction.customId === "recusar") {
        session.status = "Negado";
        await interaction.channel.send("❌ NEGADO pelo juiz.");
        return interaction.reply({ content: "✔ Recusado.", ephemeral: true });
      }

      if (interaction.customId === "encerrar") {
        processos.delete(interaction.channel.id);

        await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
          SendMessages: false
        });

        await interaction.channel.send("🔒 Processo encerrado.");
        return interaction.reply({ content: "✔ Encerrado.", ephemeral: true });
      }

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
    }

    /* DEFESA */
    if (interaction.isModalSubmit() && interaction.customId === "defesa_modal") {

      const texto = interaction.fields.getTextInputValue("texto");

      await interaction.channel.send({
        embeds: [
          new EmbedBuilder()
            .setTitle("📜 DEFESA")
            .setColor("#3498db")
            .setDescription(texto)
        ]
      });

      return interaction.reply({ content: "✔ Defesa enviada.", ephemeral: true });
    }

  } catch (err) {
    console.error(err);
  }
});

/* ================= START ================= */

await registerCommands();
client.login(TOKEN);
