const nodemailer = require('nodemailer');
const dotenv = require("dotenv");
dotenv.config();


module.exports = async (req, res) => {
  

  try {
    // Captura os dados de contato E o array de respostas que vem do formulário
    const { nome, email, empresa, mensagem, respostas } = req.body;
   
    // CONFIGURAÇÃO ADAPTADA EXATAMENTE PARA O SEU .ENV ATUAL
    const transporter = nodemailer.createTransport({
      host: process.env.MAILER_HOST,
      port: parseInt(portaSmtp || '587'),
      secure: portaSmtp === '465', // true apenas se for a porta 465
      auth: {
        user: process.env.MAILER_EMAIL, // Seu e-mail da protmar
        pass: process.env.MAILER_PASSOWORD, // Sua senha (com o erro de digitação aceito pelo código)
      },
    });

    // ----------------------------------------------------
    // EMAIL 1: Apenas os Dados de Contato (Lead Comercial)
    // ----------------------------------------------------
    const emailDadosContato = transporter.sendMail({
      from: `"Protmar Leads" <${process.env.MAILER_EMAIL}>`,
      to: 'comercial@protmar.com.br', // E-mail do setor comercial
      replyTo: email,
      subject: `💼 [CONTATO] Novo Lead B2B - ${empresa}`,
      html: `
        <div style="font-family: sans-serif; color: #0A1E46;">
          <h2>Novo Contato Comercial Recebido!</h2>
          <p><strong>Nome:</strong> ${nome}</p>
          <p><strong>E-mail:</strong> ${email}</p>
          <p><strong>Empresa:</strong> ${empresa}</p>
          <p><strong>Mensagem:</strong> ${mensagem}</p>
        </div>
      `,
    });

    // ----------------------------------------------------
    // EMAIL 2: Dados de Contato + Respostas Técnicas (Diagnóstico)
    // ----------------------------------------------------
    // Formatando as respostas para aparecerem organizadas no e-mail
    const respostasFormatadas = respostas && respostas.length > 0 
      ? respostas.map((r, i) => `<p><strong>Q${i + 1}: ${r.pergunta}</strong><br><span style="color: #E08C14;">Resposta: ${r.resposta}</span></p>`).join('')
      : '<p>Nenhuma resposta técnica foi registrada.</p>';

    const emailDiagnosticoCompleto = transporter.sendMail({
      from: `"Protmar Diagnósticos" <${process.env.MAILER_EMAIL}>`,
      to: 'comercial@protmar.com.br',
      replyTo: email,
      subject: `📊 [DIAGNÓSTICO NR-12] Relatório de Respostas - ${empresa}`,
      html: `
        <div style="font-family: sans-serif; color: #0A1E46;">
          <h2>Relatório Completo de Conformidade NR-12</h2>
          <hr style="border: 1px solid #D5DBE6;" />
          <h3>Dados da Empresa</h3>
          <p><strong>Nome do Responsável:</strong> ${nome}</p>
          <p><strong>E-mail:</strong> ${email}</p>
          <p><strong>Empresa:</strong> ${empresa}</p>
          <hr style="border: 1px solid #D5DBE6;" />
          <h3>Respostas Coletadas no Formulário</h3>
          <div style="background: #F3F5F9; padding: 15px; border-radius: 4px;">
            ${respostasFormatadas}
          </div>
        </div>
      `,
    });

    // Executa os dois envios de e-mail ao mesmo tempo em paralelo (ganha muita velocidade)
    await Promise.all([emailDadosContato, emailDiagnosticoCompleto]);

    return res.status(200).json({ success: true, message: 'Os dois e-mails foram enviados com sucesso!' });
  } catch (error) {
    console.error('Erro no servidor de e-mail:', error);
    return res.status(500).json({ success: false, error: 'Falha interna ao processar o duplo envio.' });
  }
};
