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
    .setDescription("Abrir painel de investigação")
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

// 🎮 INTERAÇÕES
client.on("interactionCreate", async (interaction) => {

  try {

    // 📌 PAINEL
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel-investigacao") {

        const embed = new EmbedBuilder()
          .setTitle("🔍⚖️ AUTORIZAÇÃO DE INVESTIGAÇÃO ⚖️🔍")
          .setColor("Gold")
          .setDescription(`
🏛️ SISTEMA DE INVESTIGAÇÃO JUDICIAL

👨‍⚖️ Nenhuma investigação sem autorização do Juiz.

✔ Identificação solicitante  
✔ Identificação alvo  
✔ Motivo detalhado  
✔ Provas iniciais  

⏳ Processo:
1️⃣ Registro  
2️⃣ Análise do Juiz  
3️⃣ Verificação  
4️⃣ Decisão  

⚖️ Tribunal ativo
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

    // 🔘 FORM
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
          new TextInputBuilder().setCustomId("motivo").setLabel("Motivo").setStyle(TextInputStyle.Paragraph).setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }

    // 📂 FORM SUBMIT
    if (interaction.isModalSubmit()) {

      const id = `#${String(++processoCount).padStart(4, "0")}`;

      const nome = interaction.fields.getTextInputValue("nome");
      const uid = interaction.fields.getTextInputValue("id");
      const alvo = interaction.fields.getTextInputValue("alvo");
      const alvo_id = interaction.fields.getTextInputValue("alvo_id");
      const motivo = interaction.fields.getTextInputValue("motivo");

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
          { name: "Solicitante", value: `${nome} (${uid})` },
          { name: "Alvo", value: `${alvo} (${alvo_id})` },
          { name: "Motivo", value: motivo },
          { name: "Status", value: "🟡 Em análise" }
        );

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("aprovar").setLabel("Aprovar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("negar").setLabel("Negar").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("encerrar").setLabel("Encerrar").setStyle(ButtonStyle.Secondary)
      );

      const audButtons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("aud_inicio").setLabel("⚖️ Audiência").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("aud_adv").setLabel("👨‍💼 Advogado").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("aud_acus").setLabel("👮 Acusação").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("aud_falar").setLabel("🗣️ Falar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("aud_encerrar").setLabel("🔒 Encerrar").setStyle(ButtonStyle.Danger)
      );

      await canal.send({ embeds: [embed], components: [buttons, audButtons] });

      await log(interaction.guild, `📂 Processo ${id} criado`);

      return interaction.reply({
        content: `Processo criado: ${canal}`,
        flags: 64
      });
    }

    // ⚖️ AUDIÊNCIA
    if (interaction.isButton()) {

      const a = audiencias.get(interaction.channel.id);

      // INICIAR
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

        return interaction.reply({ content: "⚖️ Audiência iniciada", flags: 64 });
      }

      // ADVOGADO
      if (interaction.customId === "aud_adv") {
        if (!a) return interaction.reply({ content: "❌ Sem audiência", flags: 64 });
        if (a.advogado) return interaction.reply({ content: "❌ Já existe advogado", flags: 64 });

        a.advogado = interaction.user.id;
        return interaction.reply({ content: "👨‍💼 Advogado definido", flags: 64 });
      }

      // ACUSAÇÃO
      if (interaction.customId === "aud_acus") {
        if (!a) return interaction.reply({ content: "❌ Sem audiência", flags: 64 });
        if (a.acusacao) return interaction.reply({ content: "❌ Já existe acusação", flags: 64 });

        a.acusacao = interaction.user.id;
        return interaction.reply({ content: "👮 Acusação definida", flags: 64 });
      }

      // FALAR
      if (interaction.customId === "aud_falar") {
        if (!a || !a.ativo)
          return interaction.reply({ content: "❌ Sem audiência", flags: 64 });

        const id = interaction.user.id;

        if (a.turno === "advogado" && id !== a.advogado)
          return interaction.reply({ content: "⛔ turno advogado", flags: 64 });

        if (a.turno === "acusacao" && id !== a.acusacao)
          return interaction.reply({ content: "⛔ turno acusação", flags: 64 });

        a.turno = a.turno === "advogado" ? "acusacao" : "advogado";

        return interaction.reply({
          content: `🗣️ fala registrada. Próximo: ${a.turno}`,
          flags: 64
        });
      }

      // ENCERRAR
      if (interaction.customId === "aud_encerrar") {
        if (!interaction.member.roles.cache.has(process.env.CARGO_JUIZ))
          return interaction.reply({ content: "❌ só juiz", flags: 64 });

        audiencias.delete(interaction.channel.id);

        return interaction.reply({ content: "⚖️ audiência encerrada", flags: 64 });
      }

      // DECISÕES
      const embed = EmbedBuilder.from(interaction.message.embeds?.[0] || {});

      if (interaction.customId === "aprovar") {
        embed.setColor("Green");
        await log(interaction.guild, "Aprovado");
      }

      if (interaction.customId === "negar") {
        embed.setColor("Red");
        await log(interaction.guild, "Negado");
      }

      if (interaction.customId === "encerrar") {
        embed.setColor("Grey");
        await log(interaction.guild, "Encerrado");
      }

      return interaction.update({ embeds: [embed], components: [] });
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
