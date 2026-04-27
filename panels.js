import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export function painel() {
  const embed = new EmbedBuilder()
    .setTitle("🔍⚖️ AUTORIZAÇÃO DE INVESTIGAÇÃO ⚖️🔍")
    .setColor("#d4af37")
    .setDescription(`
🏛️ SISTEMA JUDICIAL RP

👨‍⚖️ Nenhuma investigação sem autorização.

📌 Solicitação obrigatória:
• Solicitante
• Alvo
• Motivo
• Provas

⚖️ Análise do juiz obrigatória
🔨 Decisão formal

🏛️ Tribunal ativo
    `);

  const btn = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrir_processo")
      .setLabel("📂 Abrir Processo")
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [btn] };
}
