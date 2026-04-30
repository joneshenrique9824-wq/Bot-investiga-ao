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
    .setDescription(
`👮 Criado por: <@${data.criador}>

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
⏱️ Tempo: ${formatTempo(Date.now() - data.inicio)}`
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

      let tipo = null;

      if (interaction.member.roles.cache.has(POLICIA_CIVIL)) tipo = "civil";
      else if (interaction.member.roles.cache.has(POLICIA_FEDERAL)) tipo = "federal";
      else return interaction.reply({ content: "❌ Apenas Polícia.", ephemeral: true });

      const modal = new ModalBuilder()
        .setCustomId(`form_${tipo}`)
        .setTitle("📂 Investigação");

      const inputs = [
        ["solicitante_nome", "Nome do Solicitante"],
        ["solicitante_id", "ID do Solicitante"],
        ["alvo", "Alvo"],
        ["motivo", "Motivo"],
        ["provas", "Provas"]
      ];

      inputs.forEach(([id, label], i) => {
        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId(id)
              .setLabel(label)
              .setStyle(i === 3 ? TextInputStyle.Paragraph : TextInputStyle.Short)
          )
        );
      });

      return interaction.showModal(modal);
    }

    /* CRIAR */
    if (interaction.isModalSubmit() && interaction.customId.startsWith("form_")) {

      const tipo = interaction.customId.split("_")[1];
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

      const canal = await interaction.guild.channels.create({
        name: `🔍-${tipo}-${id}`,
        type: ChannelType.GuildText
      });

      const msg = await canal.send({ embeds: [gerarEmbed(id, data)] });

      processos.set(canal.id, { ...data, msgId: msg.id, id });

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("aprovar").setLabel("✔ Autorizar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("negar").setLabel("❌ Negar").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId(`infiltrado_${canal.id}`).setLabel("🕵️ Infiltrado").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("encerrar").setLabel("🔒 Encerrar").setStyle(ButtonStyle.Secondary)
      );

      await canal.send({ components: [row] });

      return interaction.reply({
        content: `✔ Investigação criada: ${canal}`,
        ephemeral: true
      });
    }

    /* BOTÕES */
    if (interaction.isButton()) {

      const p = processos.get(interaction.channel.id);
      if (!p) return;

      if (!interaction.member.roles.cache.has(CARGO_JUIZ)) {
        return interaction.reply({ content: "❌ Apenas Juiz.", ephemeral: true });
      }

      const juiz = `<@${interaction.user.id}>`;

      /* INFILTRADO */
      if (interaction.customId.startsWith("infiltrado_")) {
        const canalId = interaction.customId.split("_")[1];

        const modal = new ModalBuilder()
          .setCustomId(`set_infiltrado_${canalId}`)
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

        await interaction.channel.permissionOverwrites.set([
          {
            id: interaction.guild.roles.everyone,
            deny: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
          }
        ]);

        await interaction.channel.send(`🔒 Encerrado pelo juiz ${juiz}`);
        processos.delete(interaction.channel.id);

        return interaction.reply({ content: "✔ Encerrado.", ephemeral: true });
      }

      const msg = await interaction.channel.messages.fetch(p.msgId);
      await msg.edit({ embeds: [gerarEmbed(p.id, p)] });

      return interaction.reply({ content: "✔ Atualizado.", ephemeral: true });
    }

    /* SALVAR INFILTRADO */
    if (interaction.isModalSubmit() && interaction.customId.startsWith("set_infiltrado_")) {

      const canalId = interaction.customId.split("_")[2];
      const p = processos.get(canalId);
      if (!p) return;

      p.infiltrado = {
        nome: interaction.fields.getTextInputValue("nome"),
        passaporte: interaction.fields.getTextInputValue("passaporte")
      };

      const canal = interaction.guild.channels.cache.get(canalId);
      const msg = await canal.messages.fetch(p.msgId);

      await msg.edit({ embeds: [gerarEmbed(p.id, p)] });

      return interaction.reply({ content: "🕵️ Infiltrado definido!", ephemeral: true });
    }

  } catch (err) {
    console.error("ERRO:", err);
  }
});

/* ================= START ================= */

await registerCommands();
client.login(TOKEN);
