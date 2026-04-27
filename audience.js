import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder
} from "discord.js";

const audiencias = new Map();
const defesas = new Map();

export async function iniciarAudiencia(interaction) {
  audiencias.set(interaction.channel.id, {
    juiz: interaction.user.id,
    ativo: true
  });

  await interaction.channel.send("⚖️ AUDIÊNCIA INICIADA");

  return interaction.reply({ content: "✔ Audiência iniciada", flags: 64 });
}

export async function handleAudience(interaction) {

  // ⚖️ INICIAR
  if (interaction.isButton() && interaction.customId === "aud_inicio") {
    return iniciarAudiencia(interaction);
  }

  // 👨‍💼 ADVOGADO
  if (interaction.isButton() && interaction.customId === "advogado") {
    return interaction.reply({ content: "👨‍💼 Advogado registrado", flags: 64 });
  }

  // 👮 ACUSAÇÃO
  if (interaction.isButton() && interaction.customId === "acusacao") {
    return interaction.reply({ content: "👮 Acusação registrada", flags: 64 });
  }

  // 📜 DEFESA
  if (interaction.isButton() && interaction.customId === "defesa") {

    const modal = new ModalBuilder()
      .setCustomId("defesa_modal")
      .setTitle("📜 Defesa do Advogado");

    modal.addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId("texto")
          .setLabel("Defesa completa")
          .setStyle(TextInputStyle.Paragraph)
      )
    );

    return interaction.showModal(modal);
  }

  if (interaction.isModalSubmit() && interaction.customId === "defesa_modal") {

    const texto = interaction.fields.getTextInputValue("texto");

    defesas.set(interaction.channel.id, texto);

    await interaction.channel.send(
      `📜 **DEFESA:**\n\n${texto}`
    );

    return interaction.reply({
      content: "✔ Defesa registrada",
      flags: 64
    });
  }

  // 🔒 ENCERRAR
  if (interaction.isButton() && interaction.customId === "encerrar") {

    audiencias.delete(interaction.channel.id);

    await interaction.channel.send("🔒 Processo encerrado");

    return interaction.reply({ content: "✔ Encerrado", flags: 64 });
  }
}
