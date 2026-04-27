import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder
} from "discord.js";

const aud = new Map();

export async function handleAudience(interaction) {
  try {

    const channelId = interaction.channel.id;
    const session = aud.get(channelId);

    // ⚖️ INICIAR AUDIÊNCIA
    if (interaction.isButton() && interaction.customId === "aud_inicio") {

      aud.set(channelId, {
        juiz: interaction.user.id,
        advogado: null,
        acusacao: null,
        turno: "advogado"
      });

      await interaction.channel.send("⚖️ **AUDIÊNCIA INICIADA PELO JUIZ**");

      return interaction.reply({ content: "✔ Audiência iniciada", flags: 64 });
    }

    // 👨‍💼 ADVOGADO
    if (interaction.isButton() && interaction.customId === "advogado") {

      if (!session)
        return interaction.reply({ content: "❌ Nenhuma audiência ativa", flags: 64 });

      session.advogado = interaction.user.id;

      await interaction.channel.send(`👨‍💼 **ADVOGADO REGISTRADO:** <@${interaction.user.id}>`);

      return interaction.reply({ content: "✔ Advogado registrado", flags: 64 });
    }

    // 👮 ACUSAÇÃO
    if (interaction.isButton() && interaction.customId === "acusacao") {

      if (!session)
        return interaction.reply({ content: "❌ Nenhuma audiência ativa", flags: 64 });

      session.acusacao = interaction.user.id;

      await interaction.channel.send(`👮 **ACUSAÇÃO REGISTRADA:** <@${interaction.user.id}>`);

      return interaction.reply({ content: "✔ Acusação registrada", flags: 64 });
    }

    // 📜 DEFESA
    if (interaction.isButton() && interaction.customId === "defesa") {

      const modal = new ModalBuilder()
        .setCustomId("defesa_modal")
        .setTitle("📜 Defesa Profissional");

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

    // 📜 DEFESA FINAL (BONITA)
    if (interaction.isModalSubmit() && interaction.customId === "defesa_modal") {

      const texto = interaction.fields.getTextInputValue("texto");

      const embed = new EmbedBuilder()
        .setTitle("📜 DEFESA DO ADVOGADO")
        .setColor("#3498db")
        .setDescription(texto);

      await interaction.channel.send({ embeds: [embed] });

      return interaction.reply({
        content: "✔ Defesa registrada com sucesso",
        flags: 64
      });
    }

    // 🔒 ENCERRAR
    if (interaction.isButton() && interaction.customId === "encerrar") {

      aud.delete(channelId);

      await interaction.channel.send("🔒 **PROCESSO ENCERRADO PELO JUIZ**");

      return interaction.reply({
        content: "✔ Processo encerrado",
        flags: 64
      });
    }

  } catch (err) {
    console.error("Erro audiência:", err);

    if (!interaction.replied) {
      return interaction.reply({
        content: "❌ Erro no sistema de audiência",
        flags: 64
      });
    }
  }
}
