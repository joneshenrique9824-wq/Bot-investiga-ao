import "dotenv/config";
import {
  Client,
  GatewayIntentBits,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  REST,
  Routes,
  SlashCommandBuilder,
  ChannelType,
  PermissionsBitField
} from "discord.js";

if (!process.env.TOKEN) throw new Error("TOKEN não definido");
if (!process.env.CLIENT_ID) throw new Error("CLIENT_ID não definido");
if (!process.env.GUILD_ID) throw new Error("GUILD_ID não definido");
if (!process.env.CARGO_JUIZ) throw new Error("CARGO_JUIZ não definido");

const client = new Client({ intents: [GatewayIntentBits.Guilds] });

let processoCount = 0;
const audiencias = new Map();

// 📌 COMANDO
const commands = [
  new SlashCommandBuilder()
    .setName("painel-investigacao")
    .setDescription("Abrir painel judicial")
];

const rest = new REST({ version: "10" }).setToken(process.env.TOKEN);

(async () => {
  await rest.put(
    Routes.applicationGuildCommands(process.env.CLIENT_ID, process.env.GUILD_ID),
    { body: commands }
  );
})();

client.once("ready", () => {
  console.log(`✅ ${client.user.tag} online`);
});

// 📜 LOG
async function log(guild, msg) {
  let channel = guild.channels.cache.find(c => c.name === "📜-logs-investigacao");

  if (!channel) {
    channel = await guild.channels.create({
      name: "📜-logs-investigacao",
      type: ChannelType.GuildText
    });
  }

  channel.send(msg);
}

// 📚 ARTIGOS
function artigos() {
  return `
📚 **ARTIGOS CRIMINAIS**

• Art. 121 — Homicídio  
• Art. 155 — Furto  
• Art. 157 — Roubo  
• Art. 171 — Estelionato  
• Art. 288 — Organização criminosa  
• Art. 33 — Tráfico de drogas  
• Art. 147 — Ameaça  
• Art. 129 — Lesão corporal  
• Art. 330 — Desobediência  

⚖️ Análise judicial em andamento...
`;
}

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {

  try {

    // =========================
    // 📌 PAINEL
    // =========================
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel-investigacao") {

        const embed = new EmbedBuilder()
          .setTitle("🔍⚖️ AUTORIZAÇÃO DE INVESTIGAÇÃO ⚖️🔍")
          .setColor("Gold")
          .setDescription(`
🏛️ SISTEMA JUDICIAL ATIVO

✔ Prova inicial obrigatória  
✔ Processo registrado  
✔ Canal aberto para investigação  

⏳ Fluxo:
1 Registro  
2 Análise  
3 Julgamento  
          `);

        const btn = new ActionRowBuilder().addComponents(
          new ButtonBuilder()
            .setCustomId("abrir_form")
            .setLabel("Abrir Processo")
            .setStyle(ButtonStyle.Primary)
        );

        return interaction.reply({ embeds: [embed], components: [btn] });
      }
    }

    // =========================
    // 🔘 FORM
    // =========================
    if (interaction.isButton() && interaction.customId === "abrir_form") {

      const modal = new ModalBuilder()
        .setCustomId("form_investigacao")
        .setTitle("Novo Processo");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("nome").setLabel("Nome solicitante").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("id").setLabel("ID solicitante").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("alvo").setLabel("Nome alvo").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("alvo_id").setLabel("ID alvo").setStyle(TextInputStyle.Short).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("motivo").setLabel("Motivo detalhado").setStyle(TextInputStyle.Paragraph).setRequired(true)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder().setCustomId("provas").setLabel("Prova inicial (OBRIGATÓRIO)").setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }

    // =========================
    // 📂 CRIA PROCESSO
    // =========================
    if (interaction.isModalSubmit()) {

      await interaction.deferReply({ flags: 64 });

      const id = `#${String(++processoCount).padStart(4, "0")}`;

      const nome = interaction.fields.getTextInputValue("nome");
      const uid = interaction.fields.getTextInputValue("id");
      const alvo = interaction.fields.getTextInputValue("alvo");
      const alvo_id = interaction.fields.getTextInputValue("alvo_id");
      const motivo = interaction.fields.getTextInputValue("motivo");
      const provas = interaction.fields.getTextInputValue("provas");

      // 🔥 validação de prova inicial
      if (!provas || provas.length < 10) {
        return interaction.editReply({
          content: "❌ É obrigatório apresentar uma prova inicial mínima (descrição detalhada ou evidência)."
        });
      }

      let cat = interaction.guild.channels.cache.find(c => c.name === "📂 INVESTIGAÇÕES");

      if (!cat) {
        cat = await interaction.guild.channels.create({
          name: "📂 INVESTIGAÇÕES",
          type: ChannelType.GuildCategory
        });
      }

      const canal = await interaction.guild.channels.create({
        name: `📂-${id}`,
        type: ChannelType.GuildText,
        parent: cat.id,
        permissionOverwrites: [
          { id: interaction.guild.id, deny: [PermissionsBitField.Flags.ViewChannel] },
          { id: interaction.user.id, allow: [PermissionsBitField.Flags.ViewChannel] },
          { id: process.env.CARGO_JUIZ, allow: [PermissionsBitField.Flags.ViewChannel] }
        ]
      });

      const embed = new EmbedBuilder()
        .setTitle(`📂 PROCESSO ${id}`)
        .setColor("Yellow")
        .addFields(
          { name: "👤 Solicitante", value: `${nome} (${uid})` },
          { name: "🎯 Alvo", value: `${alvo} (${alvo_id})` },
          { name: "📄 Motivo", value: motivo },
          { name: "📎 Prova inicial", value: provas },
          { name: "📜 Status", value: "🟡 Em análise" }
        );

      const processButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("aprovar").setLabel("Aprovar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("negar").setLabel("Negar").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("encerrar").setLabel("Encerrar").setStyle(ButtonStyle.Secondary)
      );

      const audButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("aud_inicio").setLabel("⚖️ Iniciar Audiência").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("aud_adv").setLabel("👨‍💼 Defesa (Advogado)").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("aud_acus").setLabel("👮 Acusação + Artigos").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("aud_falar").setLabel("🗣️ Falar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("aud_encerrar").setLabel("🔒 Encerrar").setStyle(ButtonStyle.Danger)
      );

      await canal.send({ embeds: [embed], components: [processButtons, audButtons] });

      await log(interaction.guild, `📂 Processo ${id} criado`);

      return interaction.editReply({
        content: `✔ Processo criado: ${canal}`
      });
    }

    // =========================
    // ⚖️ BOTÕES
    // =========================
    if (interaction.isButton()) {

      const a = audiencias.get(interaction.channel.id);

      // -------------------------
      // AUDIÊNCIA INICIAR
      // -------------------------
      if (interaction.customId === "aud_inicio") {

        if (!interaction.member.roles.cache.has(process.env.CARGO_JUIZ))
          return interaction.reply({ content: "❌ Só juiz", flags: 64 });

        audiencias.set(interaction.channel.id, {
          juiz: interaction.user.id,
          advogado: null,
          acusacao: null,
          turno: "advogado",
          ativo: true
        });

        await interaction.channel.send("⚖️ AUDIÊNCIA INICIADA PELO JUIZ");

        return interaction.reply({ content: "✔ Iniciada", flags: 64 });
      }

      // -------------------------
      // ADVOGADO DEFESA (MODAL)
      // -------------------------
      if (interaction.customId === "aud_adv") {

        if (!a) return interaction.reply({ content: "❌ Sem audiência", flags: 64 });

        const modal = new ModalBuilder()
          .setCustomId("defesa_modal")
          .setTitle("Defesa do Advogado");

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("defesa")
              .setLabel("Escreva a defesa completa")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }

      // -------------------------
      // ACUSAÇÃO + ARTIGOS
      // -------------------------
      if (interaction.customId === "aud_acus") {

        if (!a) return interaction.reply({ content: "❌ Sem audiência", flags: 64 });

        await interaction.channel.send(artigos());
        await interaction.channel.send(`👮 Acusação registrada por <@${interaction.user.id}>`);

        return interaction.reply({ content: "✔ Acusação enviada", flags: 64 });
      }

      // -------------------------
      // FALAR
      // -------------------------
      if (interaction.customId === "aud_falar") {

        if (!a || !a.ativo)
          return interaction.reply({ content: "❌ Sem audiência ativa", flags: 64 });

        const uid = interaction.user.id;

        if (a.turno === "advogado" && uid !== a.advogado)
          return interaction.reply({ content: "⛔ turno do advogado", flags: 64 });

        if (a.turno === "acusacao" && uid !== a.acusacao)
          return interaction.reply({ content: "⛔ turno da acusação", flags: 64 });

        const atual = a.turno;
        a.turno = a.turno === "advogado" ? "acusacao" : "advogado";

        await interaction.channel.send(`🗣️ ${atual.toUpperCase()}: <@${uid}>`);

        return interaction.reply({
          content: `✔ Próximo turno: ${a.turno}`,
          flags: 64
        });
      }

      // -------------------------
      // ENCERRAR AUDIÊNCIA
      // -------------------------
      if (interaction.customId === "aud_encerrar") {

        if (!interaction.member.roles.cache.has(process.env.CARGO_JUIZ))
          return interaction.reply({ content: "❌ Só juiz", flags: 64 });

        audiencias.delete(interaction.channel.id);

        await interaction.channel.send("🔒 AUDIÊNCIA ENCERRADA");

        return interaction.reply({ content: "✔ Encerrado", flags: 64 });
      }

      // -------------------------
      // DECISÕES PROCESSO
      // -------------------------
      const embed = EmbedBuilder.from(interaction.message.embeds?.[0] || {});

      if (interaction.customId === "aprovar") embed.setColor("Green");
      if (interaction.customId === "negar") embed.setColor("Red");
      if (interaction.customId === "encerrar") embed.setColor("Grey");

      return interaction.update({ embeds: [embed], components: [] });
    }

    // =========================
    // 📝 DEFESA MODAL
    // =========================
    if (interaction.isModalSubmit() && interaction.customId === "defesa_modal") {

      const defesa = interaction.fields.getTextInputValue("defesa");

      await interaction.channel.send(`👨‍💼 DEFESA DO ADVOGADO:\n${defesa}`);

      return interaction.reply({
        content: "✔ Defesa registrada",
        flags: 64
      });
    }

  } catch (err) {
    console.error(err);

    if (!interaction.replied) {
      return interaction.reply({
        content: "❌ erro no sistema",
        flags: 64
      });
    }
  }
});

client.login(process.env.TOKEN);
