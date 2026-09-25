const nodemailer = require('nodemailer');

const DESTINO = 'marketing@protmar.com.br';

// Evita que dados digitados pelo usuário injetem HTML no e-mail
function esc(v) {
  return String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

// Remove quebras de linha de valores usados no assunto
function linha(v) {
  return String(v ?? '').replace(/[\r\n]+/g, ' ').trim();
}

function blocoDados({ nome, empresa, telefone, email, autorizaContato }) {
  return `
    <p><strong>Nome:</strong> ${esc(nome)}</p>
    <p><strong>Empresa:</strong> ${esc(empresa)}</p>
    <p><strong>Telefone / WhatsApp:</strong> ${esc(telefone)}</p>
    <p><strong>E-mail:</strong> ${esc(email || 'Não informado')}</p>
    <p><strong>Autoriza contato:</strong> ${esc(autorizaContato)}</p>`;
}

// EMAIL 1: enviado quando o usuário preenche os dados de contato
function emailContato(d) {
  return {
    subject: `💼 [CONTATO] Novo lead NR-12 - ${linha(d.empresa)}`,
    html: `
      <div style="font-family: sans-serif; color: #0A1E46;">
        <h2>Novo contato recebido</h2>
        <p>O usuário preencheu os dados e iniciou o diagnóstico NR-12.</p>
        <hr style="border: 1px solid #D5DBE6;" />
        ${blocoDados(d)}
      </div>`,
  };
}

// EMAIL 2: enviado quando o usuário conclui o questionário
function emailDiagnostico(d) {
  const respostas = Array.isArray(d.respostas) ? d.respostas : [];
  const respostasFormatadas = respostas.length
    ? respostas.map((r, i) => `<p><strong>Q${i + 1}: ${esc(r && r.pergunta)}</strong><br><span style="color: #E08C14;">Resposta: ${esc(r && r.resposta)}</span></p>`).join('')
    : '<p>Nenhuma resposta técnica foi registrada.</p>';

  return {
    subject: `📊 [DIAGNÓSTICO NR-12] ${linha(d.resultado)} - ${linha(d.empresa)}`,
    html: `
      <div style="font-family: sans-serif; color: #0A1E46;">
        <h2>Relatório completo de conformidade NR-12</h2>
        <p><strong>Resultado:</strong> ${esc(d.resultado)}<br><strong>Pontos:</strong> ${esc(d.pontos)}</p>
        <hr style="border: 1px solid #D5DBE6;" />
        <h3>Dados da empresa</h3>
        ${blocoDados(d)}
        <hr style="border: 1px solid #D5DBE6;" />
        <h3>Respostas coletadas no formulário</h3>
        <div style="background: #F3F5F9; padding: 15px; border-radius: 4px;">
          ${respostasFormatadas}
        </div>
      </div>`,
  };
}

const TIPOS = { contato: emailContato, diagnostico: emailDiagnostico };

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ success: false });
  }

  try {
    const dados = req.body || {};
    const montar = TIPOS[dados.tipo];

    if (!montar || !dados.nome || !dados.empresa || !dados.telefone) {
      return res.status(400).json({ success: false, error: 'Dados inválidos.' });
    }

    const porta = parseInt(process.env.MAILER_PORT || '587', 10);
    const transporter = nodemailer.createTransport({
      host: process.env.MAILER_HOST,
      port: porta,
      secure: porta === 465, // true apenas na porta 465
      auth: {
        user: process.env.MAILER_EMAIL,
        pass: process.env.MAILER_PASSWORD,
      },
    });

    const { subject, html } = montar(dados);
    const emailValido = /^\S+@\S+\.\S+$/.test(dados.email || '');

    const info = await transporter.sendMail({
      from: `"Protmar Diagnóstico NR-12" <${process.env.MAILER_EMAIL}>`,
      to: DESTINO,
      replyTo: emailValido ? dados.email : undefined,
      subject,
      html,
    });

    console.log('E-mail enviado:', { to: DESTINO, messageId: info.messageId, accepted: info.accepted, rejected: info.rejected, response: info.response });

    return res.status(200).json({ success: true });
  } catch (error) {
    console.error('Erro no servidor de e-mail:', error);
    return res.status(500).json({ success: false, error: 'Falha ao enviar e-mail.' });
  }
};
