import {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  ActionRowBuilder,
  EmbedBuilder,
  PermissionsBitField,
  ChannelType
} from "discord.js";

const aud = new Map();

// 🔐 COLOQUE AQUI O ID DO CARGO DO JUIZ
const CARGO_JUIZ = "1498346869988921505";

export async function handleAudience(interaction) {
  try {

    const channelId = interaction.channel.id;
    const session = aud.get(channelId);

    // ⚖️ INICIAR AUDIÊNCIA (JUÍZ SOMENTE)
    if (interaction.isButton() && interaction.customId === "aud_inicio") {

      if (!interaction.member.roles.cache.has(CARGO_JUIZ)) {
        return interaction.reply({
          content: "❌ Apenas o Juiz pode iniciar a audiência.",
          flags: 64
        });
      }

      aud.set(channelId, {
        juiz: interaction.user.id,
        advogado: null,
        acusacao: null,
        ativo: true,
        turno: "advogado"
      });

      await interaction.channel.send("⚖️ **AUDIÊNCIA INICIADA PELO JUIZ**");

      return interaction.reply({
        content: "✔ Audiência iniciada com sucesso",
        flags: 64
      });
    }

    // 👨‍💼 ADVOGADO
    if (interaction.isButton() && interaction.customId === "advogado") {

      if (!session || !session.ativo) {
        return interaction.reply({
          content: "❌ Nenhuma audiência ativa.",
          flags: 64
        });
      }

      session.advogado = interaction.user.id;

      await interaction.channel.send(`👨‍💼 **ADVOGADO REGISTRADO:** <@${interaction.user.id}>`);

      return interaction.reply({
        content: "✔ Advogado registrado",
        flags: 64
      });
    }

    // 👮 ACUSAÇÃO
    if (interaction.isButton() && interaction.customId === "acusacao") {

      if (!session || !session.ativo) {
        return interaction.reply({
          content: "❌ Nenhuma audiência ativa.",
          flags: 64
        });
      }

      session.acusacao = interaction.user.id;

      await interaction.channel.send(`👮 **ACUSAÇÃO REGISTRADA:** <@${interaction.user.id}>`);

      return interaction.reply({
        content: "✔ Acusação registrada",
        flags: 64
      });
    }

    // 📜 DEFESA (MODAL)
    if (interaction.isButton() && interaction.customId === "defesa") {

      const modal = new ModalBuilder()
        .setCustomId("defesa_modal")
        .setTitle("📜 Defesa Profissional");

      modal.addComponents(
        new ActionRowBuilder().addComponents(
          new TextInputBuilder()
            .setCustomId("texto")
            .setLabel("Escreva sua defesa completa")
            .setStyle(TextInputStyle.Paragraph)
            .setRequired(true)
        )
      );

      return interaction.showModal(modal);
    }

    // 📜 DEFESA FINAL (EMBEDED PROFISSIONAL)
    if (interaction.isModalSubmit() && interaction.customId === "defesa_modal") {

      const texto = interaction.fields.getTextInputValue("texto");

      const embed = new EmbedBuilder()
        .setTitle("📜 DEFESA DO ADVOGADO")
        .setColor("#3498db")
        .setDescription(texto)
        .setFooter({ text: "Sistema Judicial • Defesa registrada" });

      await interaction.channel.send({ embeds: [embed] });

      return interaction.reply({
        content: "✔ Defesa registrada com sucesso",
        flags: 64
      });
    }

    // 🔒 ENCERRAR (TRAVA CHAT)
    if (interaction.isButton() && interaction.customId === "encerrar") {

      if (!interaction.member.roles.cache.has(CARGO_JUIZ)) {
        return interaction.reply({
          content: "❌ Apenas o Juiz pode encerrar o processo.",
          flags: 64
        });
      }

      aud.delete(channelId);

      // 🔒 TRAVA O CHAT
      await interaction.channel.permissionOverwrites.edit(interaction.guild.id, {
        SendMessages: false
      });

      await interaction.channel.send("🔒 **PROCESSO ENCERRADO PELO JUIZ**");

      return interaction.reply({
        content: "✔ Processo encerrado e chat bloqueado.",
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
