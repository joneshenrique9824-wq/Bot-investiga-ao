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

export async function handleInteractions(interaction) {

  // 📌 PAINEL
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painel-investigacao") {
      return interaction.reply(painel());
    }
  }

  // 📂 ABRIR FORM
  if (interaction.isButton() && interaction.customId === "abrir_processo") {

    const modal = new ModalBuilder()
      .setCustomId("form_processo")
      .setTitle("📂 Novo Processo");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("solicitante")
          .setLabel("Solicitante")
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("alvo")
          .setLabel("Alvo")
          .setStyle(TextInputStyle.Short)
      ),
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("motivo")
          .setLabel("Motivo")
          .setStyle(TextInputStyle.Paragraph)
      )
    );

    return interaction.showModal(modal);
  }

  // 📂 CRIAR PROCESSO (CANAL SEPARADO)
  if (interaction.isModalSubmit() && interaction.customId === "form_processo") {

    const id = String(++count).padStart(4, "0");

    const solicitante = interaction.fields.getTextInputValue("solicitante");
    const alvo = interaction.fields.getTextInputValue("alvo");
    const motivo = interaction.fields.getTextInputValue("motivo");

    let categoria = interaction.guild.channels.cache.find(c =>
      c.name === "📂 INVESTIGAÇÕES"
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
          id: process.env.CARGO_JUIZ,
          allow: [
            PermissionsBitField.Flags.ViewChannel,
            PermissionsBitField.Flags.SendMessages
          ]
        }
      ]
    });

    const embed = new EmbedBuilder()
      .setTitle(`📂 PROCESSO #${id}`)
      .setColor("Yellow")
      .setDescription(`
⚖️ STATUS: Em análise judicial

👤 Solicitante: ${solicitante}  
🎯 Alvo: ${alvo}  

📄 Motivo:
${motivo}

━━━━━━━━━━━━━━━━━━━━━━

📌 Aguarde análise do juiz.
    `);

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("aud_inicio").setLabel("⚖️ Iniciar Audiência").setStyle(ButtonStyle.Primary),
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

  // ⚖️ AUDIÊNCIA + DEFESA
  return handleAudience(interaction);
}
