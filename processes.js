import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ChannelType
} from "discord.js";

import { painel } from "./panels.js";
import { iniciarAudiencia, handleAudience } from "./audience.js";

let count = 0;

export async function handleInteractions(interaction) {

  // =====================
  // COMANDO
  // =====================
  if (interaction.isChatInputCommand()) {
    if (interaction.commandName === "painel-investigacao") {
      return interaction.reply(painel());
    }
  }

  // =====================
  // ABRIR MODAL
  // =====================
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

  // =====================
  // CRIAR PROCESSO
  // =====================
  if (interaction.isModalSubmit() && interaction.customId === "form_processo") {

    const id = `#${String(++count).padStart(4, "0")}`;

    const solicitante = interaction.fields.getTextInputValue("solicitante");
    const alvo = interaction.fields.getTextInputValue("alvo");
    const motivo = interaction.fields.getTextInputValue("motivo");

    const canal = await interaction.guild.channels.create({
      name: `processo-${id}`,
      type: ChannelType.GuildText
    });

    const embed = new EmbedBuilder()
      .setTitle(`📂 PROCESSO ${id}`)
      .setColor("Yellow")
      .addFields(
        { name: "Solicitante", value: solicitante },
        { name: "Alvo", value: alvo },
        { name: "Motivo", value: motivo },
        { name: "Status", value: "🟡 Em análise" }
      );

    const row1 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("aud_inicio").setLabel("⚖️ Audiência").setStyle(ButtonStyle.Primary),
      new ButtonBuilder().setCustomId("encerrar").setLabel("🔒 Encerrar").setStyle(ButtonStyle.Danger)
    );

    const row2 = new ActionRowBuilder().addComponents(
      new ButtonBuilder().setCustomId("advogado").setLabel("👨‍💼 Advogado").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("acusacao").setLabel("👮 Acusação").setStyle(ButtonStyle.Success),
      new ButtonBuilder().setCustomId("defesa").setLabel("📜 Defesa").setStyle(ButtonStyle.Primary)
    );

    await canal.send({ embeds: [embed], components: [row1, row2] });

    return interaction.reply({
      content: `✔ Processo criado: ${canal}`,
      flags: 64
    });
  }

  // =====================
  // AUDIÊNCIA + DEFESA + ACUSAÇÃO
  // =====================
  return handleAudience(interaction);
}
