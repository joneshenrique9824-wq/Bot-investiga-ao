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

// 🧠 LOG
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
🏛️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🏛️
        SISTEMA DE INVESTIGAÇÃO JUDICIAL
🏛️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🏛️

👨‍⚖️ AUTORIDADE JUDICIAL:
Nenhuma investigação poderá ser iniciada sem autorização formal do Juiz responsável.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 REQUISITOS OBRIGATÓRIOS:

✔ Identificação completa do solicitante  
✔ Identificação completa do alvo  
✔ Motivo detalhado do caso  
✔ Provas iniciais obrigatórias  

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏳ PROCESSO DE ANÁLISE:

1️⃣ Registro automático no sistema  
2️⃣ Análise detalhada do Juiz  
3️⃣ Verificação de provas apresentadas  
4️⃣ Aprovação ou negação formal  

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ DECISÃO FINAL:

• Autorização deferida → Investigação liberada  
• Autorização indeferida → Caso arquivado  

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⛔ OBSERVAÇÕES:

• Solicitações falsas serão punidas  
• Todo processo é monitorado pelo tribunal  
• Apenas casos reais serão aceitos  

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

👨‍⚖️ Juiz Responsável: Nakamura Ofc  
🏛️ Tribunal de Justiça Oficial  
⚖️ Sistema Ativo
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

    // 🔘 BOTÃO
    if (interaction.isButton()) {

      if (interaction.customId === "abrir_form") {

        const modal = new ModalBuilder()
          .setCustomId("form_investigacao")
          .setTitle("📂 Novo Processo");

        modal.addComponents(
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("solicitante_nome")
              .setLabel("Nome do Solicitante")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("solicitante_id")
              .setLabel("ID do Solicitante")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("alvo_nome")
              .setLabel("Nome do Alvo")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("alvo_id")
              .setLabel("ID do Alvo")
              .setStyle(TextInputStyle.Short)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("motivo")
              .setLabel("Motivo da Investigação")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          ),
          new ActionRowBuilder().addComponents(
            new TextInputBuilder()
              .setCustomId("provas")
              .setLabel("Provas Iniciais")
              .setStyle(TextInputStyle.Paragraph)
              .setRequired(true)
          )
        );

        return interaction.showModal(modal);
      }
    }

    // 📂 FORM
    if (interaction.isModalSubmit()) {

      await interaction.deferReply({ flags: 64 });

      processoCount++;
      const id = `#${String(processoCount).padStart(4, "0")}`;

      const solicitante_nome = interaction.fields.getTextInputValue("solicitante_nome");
      const solicitante_id = interaction.fields.getTextInputValue("solicitante_id");
      const alvo_nome = interaction.fields.getTextInputValue("alvo_nome");
      const alvo_id = interaction.fields.getTextInputValue("alvo_id");
      const motivo = interaction.fields.getTextInputValue("motivo");
      const provas = interaction.fields.getTextInputValue("provas");

      let categoria = interaction.guild.channels.cache.find(c => c.name === "📂 INVESTIGAÇÕES");

      if (!categoria) {
        categoria = await interaction.guild.channels.create({
          name: "📂 INVESTIGAÇÕES",
          type: ChannelType.GuildCategory
        });
      }

      const canal = await interaction.guild.channels.create({
        name: `📂・${id}`,
        type: ChannelType.GuildText,
        parent: categoria.id,
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
          { name: "👤 SOLICITANTE", value: `${solicitante_nome} (${solicitante_id})` },
          { name: "🎯 ALVO", value: `${alvo_nome} (${alvo_id})` },
          { name: "📄 MOTIVO", value: motivo },
          { name: "📎 PROVAS", value: provas },
          { name: "📜 STATUS", value: "🟡 Em análise" },
          { name: "👮 RESPONSÁVEL", value: "Ninguém" }
        );

      const buttons = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("assumir").setLabel("Assumir").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("aprovar").setLabel("Aprovar").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("negar").setLabel("Negar").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("encerrar").setLabel("Encerrar").setStyle(ButtonStyle.Secondary)
      );

      await canal.send({ embeds: [embed], components: [buttons] });

      await log(interaction.guild, `📂 Processo ${id} criado por ${interaction.user.tag}`);

      return interaction.editReply({
        content: `✅ Processo criado: ${canal}`
      });
    }

    // ⚖️ BOTÕES
    if (interaction.isButton()) {

      const embed = EmbedBuilder.from(interaction.message.embeds[0]);

      if (interaction.customId === "aprovar") {
        if (!interaction.member.roles.cache.has(process.env.CARGO_JUIZ))
          return interaction.reply({ content: "❌ Sem permissão", flags: 64 });

        embed.setColor("Green");
        embed.addFields({ name: "👨‍⚖️ DECISÃO", value: `Autorizado por ${interaction.user.tag}` });

        await log(interaction.guild, `🟢 Aprovado por ${interaction.user.tag}`);

        return interaction.update({ embeds: [embed], components: [] });
      }

      if (interaction.customId === "negar") {
        if (!interaction.member.roles.cache.has(process.env.CARGO_JUIZ))
          return interaction.reply({ content: "❌ Sem permissão", flags: 64 });

        embed.setColor("Red");
        embed.addFields({ name: "👨‍⚖️ DECISÃO", value: `Negado por ${interaction.user.tag}` });

        await log(interaction.guild, `🔴 Negado por ${interaction.user.tag}`);

        return interaction.update({ embeds: [embed], components: [] });
      }

      if (interaction.customId === "encerrar") {
        embed.setColor("Grey");

        await log(interaction.guild, `⚫ Encerrado por ${interaction.user.tag}`);

        return interaction.update({ embeds: [embed], components: [] });
      }
    }

  } catch (err) {
    console.error("Erro geral:", err);

    if (!interaction.replied) {
      return interaction.reply({
        content: "❌ Erro no sistema.",
        flags: 64
      });
    }
  }
});

client.login(process.env.TOKEN);
