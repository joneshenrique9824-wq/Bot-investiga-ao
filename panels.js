import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export function painel() {
  const embed = new EmbedBuilder()
    .setTitle("🔍⚖️ AUTORIZAÇÃO DE INVESTIGAÇÃO ⚖️🔍")
    .setColor("#d4af37")
    .setDescription(`
🏛️━━━━━━━━━━━━━━━━━━━━━━

👨‍⚖️ AUTORIDADE JUDICIAL:
Nenhuma investigação poderá ser iniciada sem autorização do Juiz.

━━━━━━━━━━━━━━━━━━━━━━

📌 REQUISITOS:

✔ Solicitante completo  
✔ Alvo completo  
✔ Motivo detalhado  
✔ Provas iniciais  

━━━━━━━━━━━━━━━━━━━━━━

⏳ PROCESSO:

1️⃣ Registro  
2️⃣ Análise do Juiz  
3️⃣ Verificação de provas  
4️⃣ Decisão final  

━━━━━━━━━━━━━━━━━━━━━━

⚖️ STATUS:
🟡 Em análise judicial
    `);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrir_processo")
      .setLabel("📂 Abrir Processo")
      .setStyle(ButtonStyle.Primary)
  );

  return { embeds: [embed], components: [row] };
}
