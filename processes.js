import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType,
  PermissionsBitField
} from "discord.js";

import { painel } from "./panels.js";
import { handleAudience } from "./audience.js";

let count = 0;
const cooldown = new Set();

// ⚖️ CARGO DO JUIZ
const CARGO_JUIZ = "1498346869988921505";

export async function handleInteractions(interaction) {
  try {

    // 📌 PAINEL
    if (interaction.isChatInputCommand()) {
      if (interaction.commandName === "painel-investigacao") {
        return interaction.reply(painel());
      }
    }

    // 📂 ABRIR FORM
    if (interaction.isButton() && interaction.customId === "abrir_processo") {

      if (cooldown.has(interaction.user.id))
        return interaction.reply({ content: "⏳ Aguarde...", flags: 64 });

      cooldown.add(interaction.user.id);
      setTimeout(() => cooldown.delete(interaction.user.id), 3000);

      const modal = new ModalBuilder()
        .setCustomId("form_processo")
        .setTitle("📂 Novo Processo Judicial");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("solicitante")
            .setLabel("👤 Nome do Solicitante")
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("alvo")
            .setLabel("🎯 Nome do Alvo")
            .setStyle(TextInputStyle.Short)
        ),
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("motivo")
            .setLabel("📄 Motivo detalhado")
            .setStyle(TextInputStyle.Paragraph)
        )
      );

      return interaction.showModal(modal);
    }

    // 📂 CRIAR PROCESSO
    if (interaction.isModalSubmit() && interaction.customId === "form_processo") {

      const id = String(++count).padStart(4, "0");

      const solicitante = interaction.fields.getTextInputValue("solicitante");
      const alvo = interaction.fields.getTextInputValue("alvo");
      const motivo = interaction.fields.getTextInputValue("motivo");

      let categoria = interaction.guild.channels.cache.find(
        c => c.name === "📂 INVESTIGAÇÕES"
      );

      if (!categoria) {
        categoria = await interaction.guild.channels.create({
          name: "📂 INVESTIGAÇÕES",
          type: ChannelType.GuildCategory
        });
      }

      const canal = await interaction.guild.channels.create({
        name: `📂・processo-${id}`,
        type: ChannelType.GuildText,
        parent: categoria.id,
        permissionOverwrites: [
          {
            id: interaction.guild.id,
            deny: [PermissionsBitField.Flags.ViewChannel]
          },
          {
            id: interaction.user.id,
            allow: [
              PermissionsBitField.Flags.ViewChannel,
              PermissionsBitField.Flags.SendMessages
            ]
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

      const embed = new EmbedBuilder()
        .setTitle(`📂 PROCESSO JUDICIAL #${id}`)
        .setColor("#f1c40f")
        .setDescription(`
⚖️ **STATUS: EM ANÁLISE**

👤 **Solicitante:** ${solicitante}  
🎯 **Alvo:** ${alvo}  

📄 **Motivo:**
${motivo}

━━━━━━━━━━━━━━━━━━━━━━

📌 Aguarde análise do juiz responsável.
        `);

      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId("aud_inicio").setLabel("⚖️ Audiência").setStyle(ButtonStyle.Primary),
        new ButtonBuilder().setCustomId("advogado").setLabel("👨‍💼 Advogado").setStyle(ButtonStyle.Success),
        new ButtonBuilder().setCustomId("acusacao").setLabel("👮 Acusação").setStyle(ButtonStyle.Danger),
        new ButtonBuilder().setCustomId("defesa").setLabel("📜 Defesa").setStyle(ButtonStyle.Secondary),
        new ButtonBuilder().setCustomId("encerrar").setLabel("🔒 Encerrar").setStyle(ButtonStyle.Danger)
      );

      await canal.send({ embeds: [embed], components: [row] });

      return interaction.reply({
        content: `✔ Processo criado: ${canal}`,
        flags: 64
      });
    }

    // ⚖️ BLOQUEIO DE JUIZ (AQUI ENTRA A SEGURANÇA)
    if (interaction.isButton()) {

      // 🔒 iniciar audiência só juiz
      if (interaction.customId === "aud_inicio") {
        if (!interaction.member.roles.cache.has(CARGO_JUIZ)) {
          return interaction.reply({
            content: "❌ Apenas o Juiz pode iniciar audiência.",
            flags: 64
          });
        }
      }

      // 🔒 encerrar só juiz
      if (interaction.customId === "encerrar") {
        if (!interaction.member.roles.cache.has(CARGO_JUIZ)) {
          return interaction.reply({
            content: "❌ Apenas o Juiz pode encerrar o processo.",
            flags: 64
          });
        }
      }
    }

    // ⚖️ AUDIÊNCIA / DEFESA
    return handleAudience(interaction);

  } catch (err) {
    console.error("Erro processos:", err);

    if (!interaction.replied) {
      return interaction.reply({
        content: "❌ Erro interno no sistema judicial.",
        flags: 64
      });
    }
  }
}
