import { EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } from "discord.js";

export function painel() {
  const embed = new EmbedBuilder()
    .setTitle("🔍⚖️ AUTORIZAÇÃO DE INVESTIGAÇÃO ⚖️🔍")
    .setColor("#d4af37")
    .setDescription(`
🏛️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🏛️
        **SISTEMA JUDICIAL ATIVO**
🏛️━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━🏛️

👨‍⚖️ **AUTORIDADE JUDICIAL**
Nenhuma investigação pode ser iniciada sem autorização formal do Juiz responsável.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

📌 **REQUISITOS OBRIGATÓRIOS**

✔ Identificação completa do solicitante  
✔ Identificação completa do alvo  
✔ Motivo detalhado da investigação  
✔ Provas iniciais obrigatórias  

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⏳ **PROCESSO DE ANÁLISE**

1️⃣ Registro automático no sistema  
2️⃣ Análise do Juiz responsável  
3️⃣ Verificação das provas apresentadas  
4️⃣ Aprovação ou negação formal  

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⚖️ **STATUS ATUAL**
🟢 **APTO PARA ANÁLISE**

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

⛔ **IMPORTANTE**
• Solicitações falsas serão punidas  
• Apenas casos reais serão aceitos  
• Todo processo é monitorado pelo tribunal  

🏛️ Sistema do Tribunal Ativo
    `);

  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId("abrir_processo")
      .setLabel("📂 Abrir Processo")
      .setStyle(ButtonStyle.Success)
  );

  return {
    embeds: [embed],
    components: [row]
  };
}
