// ==========================================
// GERAR RELATÓRIO PDF
// ==========================================
document.getElementById('btn-gerar-pdf').addEventListener('click', async () => {
  if (registrosFiltrados.length === 0) { 
    showToast("Não há dados para gerar o PDF. Aplique um filtro.", "error"); 
    return; 
  }
  
  showToast("Preparando relatório PDF... Aguarde.", "info");
  
  const btnPdf = document.getElementById('btn-gerar-pdf');
  const divPaginacao = document.getElementById('paginacao-resultados');
  const cardsFiltro = document.querySelectorAll('.filtros-card'); // Pega as caixas de filtro e pesquisa
  const dashboard = document.getElementById('secao-dashboard');

  // 1. Preparar a tela (esconde filtros, botões e tira a paginação)
  btnPdf.classList.add('oculto');
  divPaginacao.classList.add('oculto');
  cardsFiltro.forEach(card => card.classList.add('oculto')); // Esconde os filtros pra ficar limpo no PDF
  
  // Renderiza a tabela inteira (sem limites de 15 por página) para o PDF
  renderizarTabelaCompletaParaPDF(registrosFiltrados);

  // 2. Configurações de qualidade e formato do PDF
  const opt = {
    margin:       [10, 10, 10, 10], // Margens do PDF
    filename:     'Relatorio_SAREM.pdf',
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true }, // Scale 2 deixa os gráficos com alta resolução
    jsPDF:        { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };

  // 3. Gera o PDF e restaura a tela original
  try {
    await html2pdf().set(opt).from(dashboard).save();
    showToast("PDF gerado e baixado com sucesso!", "success");
  } catch (error) {
    console.error("Erro ao gerar PDF: ", error);
    showToast("Ocorreu um erro ao gerar o documento.", "error");
  } finally {
    // Restaura a visibilidade dos botões e filtros
    btnPdf.classList.remove('oculto');
    cardsFiltro.forEach(card => card.classList.remove('oculto'));
    
    // Volta a tabela para o modo paginado normal
    renderizarTabela(registrosFiltrados, true);
  }
});

// Função auxiliar apenas para montar a tabela sem limite de paginação
function renderizarTabelaCompletaParaPDF(dados) {
  const tbody = document.getElementById("tabela-corpo");
  tbody.innerHTML = "";
  
  const comNotaGlobal = dados.filter(r => r.notaPort != null || r.notaMat != null);
  
  comNotaGlobal.forEach(r => {
    const pStr = r.notaPort != null ? parseFloat(r.notaPort).toFixed(1) : "—";
    const mStr = r.notaMat != null ? parseFloat(r.notaMat).toFixed(1) : "—";
    
    const media = parseFloat(r.media);
    let badgeMedia = '<span style="color:#ccc;">—</span>';
    if (!isNaN(media)) {
      const bc = media >= 7 ? "badge-verde" : media >= 5 ? "badge-amarelo" : "badge-vermelho";
      badgeMedia = `<span class="badge ${bc}">${media.toFixed(1)}</span>`;
    }
    
    const anoFormatado = r.ano || "2026";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `<td style="color:var(--text-light); font-size:12px;">${anoFormatado}</td>
                    <td style="font-weight:600">${r.aluno}</td>
                    <td style="font-size:12px">${r.escola}</td>
                    <td>${r.serie}</td><td>${r.turma}</td>
                    <td>${r.periodo === "inicial" ? "Inicial" : "Final"}</td>
                    <td style="text-align:center">${pStr}</td>
                    <td style="text-align:center">${mStr}</td>
                    <td style="text-align:center">${badgeMedia}</td>`;
    tbody.appendChild(tr);
  });
}
