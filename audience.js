import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from "discord.js";

const aud = new Map();

export async function handleAudience(interaction) {

  // ⚖️ INICIAR AUDIÊNCIA
  if (interaction.isButton() && interaction.customId === "aud_inicio") {

    aud.set(interaction.channel.id, {
      juiz: interaction.user.id
    });

    return interaction.reply({
      content: "⚖️ Audiência iniciada pelo juiz.",
      flags: 64
    });
  }

  // 👨‍💼 ADVOGADO
  if (interaction.isButton() && interaction.customId === "advogado") {
    return interaction.reply({
      content: "👨‍💼 Advogado registrado no caso.",
      flags: 64
    });
  }

  // 👮 ACUSAÇÃO
  if (interaction.isButton() && interaction.customId === "acusacao") {
    return interaction.reply({
      content: "👮 Acusação registrada no caso.",
      flags: 64
    });
  }

  // 📜 DEFESA (ESCRITA)
  if (interaction.isButton() && interaction.customId === "defesa") {

    const modal = new ModalBuilder()
      .setCustomId("defesa_modal")
      .setTitle("📜 Defesa do Advogado");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("texto")
          .setLabel("Escreva a defesa completa")
          .setStyle(TextInputStyle.Paragraph)
      )
    );

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === "defesa_modal") {

    const texto = interaction.fields.getTextInputValue("texto");

    await interaction.channel.send(`📜 **DEFESA DO ADVOGADO:**\n\n${texto}`);

    return interaction.reply({
      content: "✔ Defesa registrada com sucesso",
      flags: 64
    });
  }

  // 🔒 ENCERRAR
  if (interaction.isButton() && interaction.customId === "encerrar") {

    return interaction.reply({
      content: "🔒 Processo encerrado pelo juiz.",
      flags: 64
    });
  }
}
