// ==========================================
// CONFIGURAÇÃO DO FIREBASE
// ==========================================
const firebaseConfig = {
  apiKey: "AIzaSyAZd5yyiJCXju1mKjAR16R5dpf15yxqQK4",
  authDomain: "sarem-f2539.firebaseapp.com",
  projectId: "sarem-f2539",
  storageBucket: "sarem-f2539.firebasestorage.app",
  messagingSenderId: "787644291903",
  appId: "1:787644291903:web:e227ec78b1885b7506518a"
};

firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// ==========================================
// VARIÁVEIS GLOBAIS E ESTADOS
// ==========================================
const ADMINEMAIL = "admin@sarem.com";
let usuarioAtual = null;
let todosRegistros = [];
let registrosFiltrados = [];
let charts = {};
let alunosTurmaAtual = [];
let ESCOLAS_DINAMICAS = []; 

// Controle de Paginação
let paginaAtual = 1;
const itensPorPagina = 50;

// ==========================================
// FUNÇÕES UTILITÁRIAS E UI
// ==========================================
function arred(n) {
  return (Math.round(n * 10) / 10).toFixed(1);
}

function showToast(mensagem, tipo = 'info') {
  const container = document.getElementById('toast-container');
  if (!container) return;
  
  const toast = document.createElement('div');
  let bgColor = tipo === 'success' ? '#27ae60' : tipo === 'error' ? '#e74c3c' : '#2e86c1';
  
  toast.style.cssText = `background: ${bgColor}; color: white; padding: 12px 20px; border-radius: 8px; box-shadow: 0 4px 12px rgba(0,0,0,0.15); font-size: 14px; font-weight: 600; opacity: 0; transform: translateY(20px); transition: all 0.3s ease; display: flex; align-items: center; gap: 8px;`;
  
  const icone = tipo === 'success' ? '✅' : tipo === 'error' ? '⚠️' : 'ℹ️';
  toast.innerHTML = `<span>${icone}</span> <span>${mensagem}</span>`;
  container.appendChild(toast);
  
  requestAnimationFrame(() => {
    toast.style.opacity = '1';
    toast.style.transform = 'translateY(0)';
  });
  
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(20px)';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function renderChart(id, type, labels, datasets) {
  const ctx = document.getElementById(id);
  if (!ctx) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type: type,
    data: { labels: labels, datasets: datasets },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// ==========================================
// AUTENTICAÇÃO E INICIALIZAÇÃO
// ==========================================
auth.onAuthStateChanged(user => {
  if (user) {
    usuarioAtual = user;
    document.getElementById("pagina-login").classList.add("oculto");
    document.getElementById("pagina-app").classList.remove("oculto");
    document.getElementById("header-usuario").textContent = user.email;
    
    if (user.email === ADMINEMAIL) {
      document.getElementById("btn-admin").classList.remove("oculto");
    }
    
    // Inicia os carregamentos dinâmicos
    carregarEscolas();
    carregarUsuariosAdmin();
    carregarRegistros();
  } else {
    document.getElementById("pagina-login").classList.remove("oculto");
    document.getElementById("pagina-app").classList.add("oculto");
  }
});

document.getElementById("btn-login").addEventListener("click", () => {
  const email = document.getElementById("login-email").value;
  const senha = document.getElementById("login-senha").value;
  const erroEl = document.getElementById("login-erro");
  
  erroEl.textContent = "Acessando...";
  erroEl.style.color = "var(--primary)";
  
  auth.signInWithEmailAndPassword(email, senha).catch(() => {
    erroEl.style.color = "var(--danger)";
    erroEl.textContent = "E-mail ou senha inválidos.";
  });
});

document.getElementById("login-senha").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("btn-login").click();
});

document.getElementById("btn-logout").addEventListener("click", () => auth.signOut());

// ==========================================
// NAVEGAÇÃO DAS ABAS
// ==========================================
document.querySelectorAll(".nav-btn").forEach(btn => {
  btn.addEventListener("click", () => {
    ["dashboard", "lancamento", "comparativo", "admin"].forEach(s => {
      document.getElementById("secao-" + s).classList.add("oculto");
    });
    document.querySelectorAll(".nav-btn").forEach(b => b.classList.remove("ativo"));
    document.getElementById("secao-" + btn.getAttribute("data-secao")).classList.remove("oculto");
    btn.classList.add("ativo");
  });
});

// ==========================================
// DADOS DINÂMICOS (ESCOLAS E USUÁRIOS)
// ==========================================
async function carregarEscolas() {
  try {
    const snap = await db.collection("escolas").orderBy("nome").get();
    
    if (snap.empty) {
      // Se banco estiver vazio, carrega lista padrão e salva no banco
      const padroes = ["EM Comecinho de Vida", "EM Dom Bosco", "EM Elias Carrijo de Sousa", "EM Maria Aparecida Almeida Paniago", "EM Maria Eduarda Condinho Filgueiras", "EM Otalécio Alves Irineu", "EM Padre Maximinio", "EM Professor Juarez Távora de Carvalho", "Escola Municipal Professor Salviano Neves Amorim", "EM Santo Antônio", "EM Tonico Corredeira"];
      const batch = db.batch();
      padroes.forEach(e => batch.set(db.collection("escolas").doc(), { nome: e }));
      await batch.commit();
      ESCOLAS_DINAMICAS = padroes.sort();
    } else {
      ESCOLAS_DINAMICAS = snap.docs.map(d => d.data().nome);
    }
    popularSelectsEscolas();
  } catch(e) {
    console.error("Erro ao carregar escolas", e);
  }
}

function popularSelectsEscolas() {
  ["filtro-escola", "l-escola", "comp-escola", "admin-origem-escola", "admin-destino-escola"].forEach(id => {
    const el = document.getElementById(id);
    if (!el) return;
    const primeira = el.options[0] ? el.options[0].outerHTML : "<option value=''>Selecione...</option>";
    el.innerHTML = primeira;
    ESCOLAS_DINAMICAS.forEach(e => {
      const opt = document.createElement("option");
      opt.value = e; opt.textContent = e;
      el.appendChild(opt);
    });
  });
}

async function carregarUsuariosAdmin() {
  const lista = document.getElementById("lista-usuarios-admin");
  if (!lista) return;
  
  try {
    const snap = await db.collection("usuarios").orderBy("nome").get();
    lista.innerHTML = "";
    
    if (snap.empty) {
      lista.innerHTML = `<p style="font-size:13px; color:var(--text-light); text-align:center; padding: 10px;">Nenhum usuário extra cadastrado no banco. Apenas o Admin principal (${ADMINEMAIL}) está ativo.</p>`;
      return;
    }
    
    snap.docs.forEach(doc => {
      const u = doc.data();
      const badge = u.cargo === 'admin' ? '<span class="badge badge-amarelo">Admin</span>' : '<span class="badge badge-verde">Avaliador</span>';
      lista.innerHTML += `
        <div class="usuario-item">
          <div class="usuario-info"><strong>${u.nome}</strong><small>${u.email}</small></div>
          ${badge}
        </div>`;
    });
  } catch(e) {
    lista.innerHTML = `<p style="font-size:13px; color:var(--danger); text-align:center;">Erro ao carregar usuários. Verifique permissões.</p>`;
  }
}

function carregarRegistros() {
  db.collection("registros").orderBy("criadoEm", "desc").onSnapshot(snap => {
    todosRegistros = snap.docs.map(d => Object.assign({ id: d.id }, d.data()));
    registrosFiltrados = todosRegistros.slice();
    atualizarDashboard(registrosFiltrados);
    popularFiltroTurma(registrosFiltrados);
    popularFiltroAvaliadora(registrosFiltrados);
  });
}

function popularFiltroTurma(dados) {
  const sel = document.getElementById("filtro-turma");
  const atual = sel.value;
  sel.innerHTML = "<option value=''>Todas as Turmas</option>";
  const turmas = [...new Set(dados.map(r => r.turma).filter(Boolean))].sort();
  turmas.forEach(t => {
    const o = document.createElement("option");
    o.value = t; o.textContent = t;
    sel.appendChild(o);
  });
  if (atual) sel.value = atual;
}

function popularFiltroAvaliadora(dados) {
  const sel = document.getElementById("filtro-avaliadora");
  const atual = sel.value;
  sel.innerHTML = "<option value=''>Todas as Avaliadoras</option>";
  const avaliadoras = [...new Set(dados.map(r => r.avaliadora).filter(Boolean))].sort();
  avaliadoras.forEach(a => {
    const o = document.createElement("option");
    o.value = a; o.textContent = a;
    sel.appendChild(o);
  });
  if (atual) sel.value = atual;
}

// ==========================================
// LÓGICA DO DASHBOARD E FILTROS
// ==========================================
document.getElementById("btn-aplicar-filtros").addEventListener("click", () => {
  const ano    = document.getElementById("filtro-ano").value;
  const escola = document.getElementById("filtro-escola").value;
  const serie  = document.getElementById("filtro-serie").value;
  const turma  = document.getElementById("filtro-turma").value;
  const aval   = document.getElementById("filtro-avaliadora").value;
  const per    = document.getElementById("filtro-periodo").value;
  
  paginaAtual = 1; // Reseta para primeira página
  
  registrosFiltrados = todosRegistros.filter(r => {
    const rAno = r.ano || "2026"; // Fallback para registros antigos sem ano
    return (!ano    || rAno === ano) &&
           (!escola || r.escola === escola) &&
           (!serie  || r.serie  === serie)  &&
           (!turma  || r.turma  === turma)  &&
           (!aval   || r.avaliadora === aval) &&
           (!per    || r.periodo === per);
  });
  atualizarDashboard(registrosFiltrados);
});

document.getElementById("btn-limpar-filtros").addEventListener("click", () => {
  ["filtro-escola", "filtro-serie", "filtro-turma", "filtro-avaliadora", "filtro-periodo"].forEach(id => {
    document.getElementById(id).value = "";
  });
  document.getElementById("filtro-ano").value = "2026"; // Restaura o padrão
  
  paginaAtual = 1;
  registrosFiltrados = todosRegistros.filter(r => (r.ano || "2026") === "2026");
  atualizarDashboard(registrosFiltrados);
});

document.getElementById("btn-pesquisa").addEventListener("click", () => {
  const termo = document.getElementById("pesquisa-geral").value.toLowerCase().trim();
  paginaAtual = 1;
  
  if (!termo) { 
    // Volta pro filtro atual
    document.getElementById("btn-aplicar-filtros").click();
    return; 
  }
  
  registrosFiltrados = todosRegistros.filter(r => {
    const rAno = r.ano || "2026";
    return (r.aluno || "").toLowerCase().includes(termo) ||
           (r.escola || "").toLowerCase().includes(termo) ||
           (r.turma || "").toLowerCase().includes(termo) ||
           (r.serie || "").toLowerCase().includes(termo) ||
           (rAno).includes(termo);
  });
  atualizarDashboard(registrosFiltrados);
});

document.getElementById("btn-limpar-pesquisa").addEventListener("click", () => {
  document.getElementById("pesquisa-geral").value = "";
  document.getElementById("btn-aplicar-filtros").click(); // reaplica os combos
});

document.getElementById("pesquisa-geral").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("btn-pesquisa").click();
});

function atualizarDashboard(dados) {
  const comNota = dados.filter(r => r.notaPort != null && r.notaMat != null);
  const total = comNota.length;
  const mediaPort = total > 0 ? arred(comNota.reduce((s, r) => s + parseFloat(r.notaPort), 0) / total) : "-";
  const mediaMat  = total > 0 ? arred(comNota.reduce((s, r) => s + parseFloat(r.notaMat), 0) / total) : "-";
  const escolas = new Set(dados.map(r => r.escola)).size;
  
  document.getElementById("card-total").textContent = total;
  document.getElementById("card-media-port").textContent = mediaPort;
  document.getElementById("card-media-mat").textContent = mediaMat;
  document.getElementById("card-escolas").textContent = escolas;
  
  renderizarTop3(comNota);
  renderizarPizzas(comNota);
  renderizarTabela(dados, true); 
}

function renderizarTop3(dados) {
  const grupos = {};
  dados.forEach(r => {
    if (!grupos[r.escola]) grupos[r.escola] = { port: [], mat: [] };
    grupos[r.escola].port.push(parseFloat(r.notaPort));
    grupos[r.escola].mat.push(parseFloat(r.notaMat));
  });
  
  const lista = Object.keys(grupos).map(e => {
    const gp = grupos[e].port, gm = grupos[e].mat;
    return { escola: e, mp: gp.reduce((a, b) => a + b, 0) / gp.length, mm: gm.reduce((a, b) => a + b, 0) / gm.length };
  });
  
  function renderEl(elId, campo) {
    const sorted = lista.slice().sort((a, b) => b[campo] - a[campo]).slice(0, 3);
    const el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = "";
    if (!sorted.length) { el.innerHTML = "<div style='text-align:center;color:var(--text-light);padding:20px'>Sem dados</div>"; return; }
    const medals = ["🥇", "🥈", "🥉"];
    sorted.forEach((e, i) => {
      const val = arred(e[campo]);
      const bc = parseFloat(val) >= 7 ? "badge-verde" : parseFloat(val) >= 5 ? "badge-amarelo" : "badge-vermelho";
      const div = document.createElement("div");
      div.className = "top3-item";
      div.innerHTML = `<span class="top3-medal">${medals[i]}</span><span class="top3-nome">${e.escola}</span><span class="top3-nota"><span class="badge ${bc}">${val}</span></span>`;
      el.appendChild(div);
    });
  }
  renderEl("top3-port", "mp");
  renderEl("top3-mat", "mm");
}

function renderizarPizzas(dados) {
  const faixas = ["0–3", "3–5", "5–7", "7–9", "9–10"];
  const cores = ["#e74c3c", "#e67e22", "#f1c40f", "#2ecc71", "#27ae60"];
  
  function contar(arr) {
    const r = [0, 0, 0, 0, 0];
    arr.forEach(n => { if (n < 3) r[0]++; else if (n < 5) r[1]++; else if (n < 7) r[2]++; else if (n < 9) r[3]++; else r[4]++; });
    return r;
  }
  
  function pizza(id, notas) {
    const ctx = document.getElementById(id);
    if (!ctx) return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(ctx, {
      type: "pie",
      data: { labels: faixas, datasets: [{ data: contar(notas), backgroundColor: cores }] },
      options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right" } } }
    });
  }
  
  pizza("grafico-dist-port", dados.map(r => parseFloat(r.notaPort)));
  pizza("grafico-dist-mat", dados.map(r => parseFloat(r.notaMat)));
}

// ==========================================
// TABELA E PAGINAÇÃO
// ==========================================
function renderizarTabela(dados, mostrar) {
  const card = document.getElementById("card-resultados");
  const tbody = document.getElementById("tabela-corpo");
  const vazio = document.getElementById("tabela-vazia");
  const count = document.getElementById("resultados-count");
  const divPaginacao = document.getElementById("paginacao-resultados");
  
  tbody.innerHTML = "";
  if (!mostrar) { if (card) card.classList.add("oculto"); return; }
  if (card) card.classList.remove("oculto");
  
  // Filtra só os que realmente tem nota para a tabela
  const comNota = dados.filter(r => r.notaPort != null);
  if (count) count.textContent = comNota.length + " aluno(s)";
  
  if (comNota.length === 0) { 
    vazio.classList.remove("oculto"); 
    divPaginacao.classList.add("oculto");
    document.getElementById("tabela-dados").classList.add("oculto");
    return; 
  }
  
  vazio.classList.add("oculto");
  document.getElementById("tabela-dados").classList.remove("oculto");
  divPaginacao.classList.remove("oculto");

  // Matemática da Paginação
  const totalPaginas = Math.ceil(comNota.length / itensPorPagina) || 1;
  if (paginaAtual > totalPaginas) paginaAtual = totalPaginas;
  
  document.getElementById("texto-paginacao").textContent = `Página ${paginaAtual} de ${totalPaginas}`;
  
  // Habilita/Desabilita Botões
  document.getElementById('btn-pagina-anterior').disabled = (paginaAtual === 1);
  document.getElementById('btn-pagina-proxima').disabled = (paginaAtual === totalPaginas);
  
  // Fatiar Array
  const inicio = (paginaAtual - 1) * itensPorPagina;
  const fim = inicio + itensPorPagina;
  const fatia = comNota.slice(inicio, fim);
  
  fatia.forEach(r => {
    const media = parseFloat(r.media);
    const bc = media >= 7 ? "badge-verde" : media >= 5 ? "badge-amarelo" : "badge-vermelho";
    const anoFormatado = r.ano || "2026";
    
    const tr = document.createElement("tr");
    tr.innerHTML = `<td style="color:var(--text-light); font-size:12px;">${anoFormatado}</td>
                    <td style="font-weight:600">${r.aluno}</td>
                    <td style="font-size:12px">${r.escola}</td>
                    <td>${r.serie}</td><td>${r.turma}</td>
                    <td>${r.periodo === "inicial" ? "Inicial" : "Final"}</td>
                    <td style="text-align:center">${parseFloat(r.notaPort).toFixed(1)}</td>
                    <td style="text-align:center">${parseFloat(r.notaMat).toFixed(1)}</td>
                    <td style="text-align:center"><span class="badge ${bc}">${media.toFixed(1)}</span></td>`;
    tbody.appendChild(tr);
  });
}

document.getElementById('btn-pagina-anterior').addEventListener('click', () => {
  if (paginaAtual > 1) { 
    paginaAtual--; 
    renderizarTabela(registrosFiltrados, true); 
  }
});

document.getElementById('btn-pagina-proxima').addEventListener('click', () => {
  const comNota = registrosFiltrados.filter(r => r.notaPort != null);
  const totalPaginas = Math.ceil(comNota.length / itensPorPagina);
  if (paginaAtual < totalPaginas) { 
    paginaAtual++; 
    renderizarTabela(registrosFiltrados, true); 
  }
});

// ==========================================
// EXPORTAR EXCEL
// ==========================================
document.getElementById('btn-exportar-excel').addEventListener('click', () => {
  if (registrosFiltrados.length === 0) { 
    showToast("Não há dados para exportar. Aplique um filtro.", "error"); 
    return; 
  }
  showToast("Gerando planilha...", "info");
  
  const dadosExportacao = registrosFiltrados
    .filter(r => r.notaPort != null)
    .map(r => ({
      "Ano": r.ano || "2026",
      "Escola": r.escola,
      "Série": r.serie,
      "Turma": r.turma,
      "Aluno": r.aluno,
      "Período": r.periodo === "inicial" ? "Diagnóstico Inicial" : "Diagnóstico Final",
      "Avaliadora": r.avaliadora,
      "Português": parseFloat(r.notaPort),
      "Matemática": parseFloat(r.notaMat),
      "Média Final": parseFloat(r.media)
    }));

  const worksheet = XLSX.utils.json_to_sheet(dadosExportacao);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Resultados SAREM");
  XLSX.writeFile(workbook, "Resultados_SAREM.xlsx");
  showToast("Planilha exportada com sucesso!", "success");
});

// ==========================================
// LANÇAMENTO DE NOTAS (LÓGICA CORE)
// ==========================================
document.getElementById("l-escola").addEventListener("change", carregarSeriesLancamento);
document.getElementById("l-serie").addEventListener("change", carregarTurmasLancamento);
document.getElementById("btn-carregar-alunos").addEventListener("click", carregarAlunosTurma);
document.getElementById("btn-salvar-turma").addEventListener("click", salvarTurmaBatch);
document.getElementById("btn-limpar-notas").addEventListener("click", limparNotasTurma);

function carregarSeriesLancamento() {
  const escola = document.getElementById("l-escola").value;
  const selSerie = document.getElementById("l-serie");
  const selTurma = document.getElementById("l-turma");
  selSerie.innerHTML = '<option value="">Selecione a série...</option>';
  selTurma.innerHTML = '<option value="">Selecione a turma...</option>';
  if (!escola) return;
  
  db.collection("alunos").where("escola", "==", escola).where("ativo", "==", true).get().then(snap => {
    const series = [...new Set(snap.docs.map(d => d.data().serie))].sort();
    series.forEach(s => selSerie.innerHTML += `<option value="${s}">${s}</option>`);
  });
}

function carregarTurmasLancamento() {
  const escola = document.getElementById("l-escola").value;
  const serie = document.getElementById("l-serie").value;
  const selTurma = document.getElementById("l-turma");
  selTurma.innerHTML = '<option value="">Selecione a turma...</option>';
  if (!escola || !serie) return;
  
  db.collection("alunos").where("escola", "==", escola).where("serie", "==", serie).where("ativo", "==", true).get().then(snap => {
    const turmas = [...new Set(snap.docs.map(d => d.data().turma))].sort();
    turmas.forEach(t => selTurma.innerHTML += `<option value="${t}">${t}</option>`);
  });
}

function carregarAlunosTurma() {
  const ano = document.getElementById("l-ano").value;
  const escola = document.getElementById("l-escola").value;
  const serie = document.getElementById("l-serie").value;
  const turma = document.getElementById("l-turma").value;
  const periodo = document.getElementById("l-periodo").value;
  const wrapper = document.getElementById("lancamento-tabela-wrapper");
  const vazio = document.getElementById("lancamento-vazio");
  
  if (!escola || !serie || !turma) { showToast("Selecione escola, série e turma.", "error"); return; }

  db.collection("alunos").where("escola", "==", escola).where("serie", "==", serie).where("turma", "==", turma).where("ativo", "==", true).get().then(alunosSnap => {
    if (alunosSnap.empty) {
      vazio.textContent = "Nenhum aluno matriculado nesta turma.";
      wrapper.classList.add("oculto");
      vazio.classList.remove("oculto");
      return;
    }
    
    db.collection("registros").where("escola", "==", escola).where("periodo", "==", periodo).get().then(regSnap => {
      const nomesDaTurma = new Set(alunosSnap.docs.map(d => d.data().nome));
      const regPorNome = {};
      
      regSnap.docs.forEach(d => {
        const r = d.data();
        const rAno = r.ano || "2026";
        if (nomesDaTurma.has(r.aluno) && rAno === ano && !regPorNome[r.aluno]) {
          regPorNome[r.aluno] = Object.assign({ id: d.id }, r);
        }
      });

      alunosTurmaAtual = alunosSnap.docs.map(d => {
        const a = d.data();
        const reg = regPorNome[a.nome] || null;
        return {
          alunoId: d.id,
          nome: a.nome,
          registroId: reg ? reg.id : null,
          notaPort: reg ? reg.notaPort : null,
          notaMat: reg ? reg.notaMat : null,
          media: reg ? reg.media : null
        };
      }).sort((a, b) => a.nome.localeCompare(b.nome));

      const periodLabel = periodo === "inicial" ? "Diagnóstico Inicial" : "Diagnóstico Final";
      document.getElementById("lancamento-turma-titulo").textContent = `[${ano}] ${escola} — ${serie} / ${turma} — ${periodLabel}`;
      
      atualizarContadoresLancamento();

      const tbody = document.getElementById("lancamento-tabela-corpo");
      tbody.innerHTML = "";
      
      alunosTurmaAtual.forEach((aluno, i) => {
        const pv = aluno.notaPort != null ? aluno.notaPort : "";
        const mv = aluno.notaMat  != null ? aluno.notaMat  : "";
        const media = aluno.media != null ? parseFloat(aluno.media) : null;
        const bc = media != null ? (media >= 7 ? "badge-verde" : media >= 5 ? "badge-amarelo" : "badge-vermelho") : "";
        const ms = media != null ? `<span class="badge ${bc}">${media.toFixed(1)}</span>` : '<span style="color:#ccc;">—</span>';
        
        const tr = document.createElement("tr");
        tr.innerHTML = `<td style="color:var(--text-light);font-size:12px;">${i + 1}</td>
                        <td style="font-weight:500;">${aluno.nome}</td>
                        <td style="text-align:center;"><input type="number" id="port-${i}" value="${pv}" min="0" max="10" step="0.1" class="input-nota" placeholder="—"></td>
                        <td style="text-align:center;"><input type="number" id="mat-${i}" value="${mv}" min="0" max="10" step="0.1" class="input-nota" placeholder="—"></td>
                        <td style="text-align:center;" id="media-${i}">${ms}</td>`;
        tbody.appendChild(tr);
        
        document.getElementById(`port-${i}`).addEventListener("input", () => atualizarMedia(i));
        document.getElementById(`mat-${i}`).addEventListener("input", () => atualizarMedia(i));
      });

      wrapper.classList.remove("oculto");
      vazio.classList.add("oculto");
    });
  });
}

function atualizarContadoresLancamento() {
  const matriculados = alunosTurmaAtual.length;
  let lancados = 0;
  
  alunosTurmaAtual.forEach((aluno, i) => {
    const inPort = document.getElementById(`port-${i}`);
    const inMat = document.getElementById(`mat-${i}`);
    const temNotaSalva = aluno.notaPort != null || aluno.notaMat != null;
    const temNotaInput = (inPort && inPort.value !== "") || (inMat && inMat.value !== "");
    if(temNotaSalva || temNotaInput) lancados++;
  });
  
  const pendentes = matriculados - lancados;
  document.getElementById('badge-matriculados').textContent = `Matriculados: ${matriculados}`;
  document.getElementById('badge-lancados').textContent = `Lançados: ${lancados}`;
  document.getElementById('badge-pendentes').textContent = `Pendentes: ${pendentes}`;
  
  if(pendentes === 0) {
    document.getElementById('badge-pendentes').classList.replace('badge-vermelho', 'badge-verde');
  } else {
    document.getElementById('badge-pendentes').classList.replace('badge-verde', 'badge-vermelho');
  }
}

function atualizarMedia(i) {
  const p = parseFloat(document.getElementById(`port-${i}`).value);
  const m = parseFloat(document.getElementById(`mat-${i}`).value);
  const cell = document.getElementById(`media-${i}`);
  
  if (!isNaN(p) && !isNaN(m)) {
    const med = Math.round((p + m) / 2 * 10) / 10;
    const bc = med >= 7 ? "badge-verde" : med >= 5 ? "badge-amarelo" : "badge-vermelho";
    cell.innerHTML = `<span class="badge ${bc}">${med.toFixed(1)}</span>`;
  } else {
    cell.innerHTML = '<span style="color:#ccc;">—</span>';
  }
  atualizarContadoresLancamento();
}

async function salvarTurmaBatch() {
  const ano = document.getElementById("l-ano").value;
  const escola = document.getElementById("l-escola").value;
  const serie  = document.getElementById("l-serie").value;
  const turma  = document.getElementById("l-turma").value;
  const periodo = document.getElementById("l-periodo").value;
  
  const btn = document.getElementById("btn-salvar-turma");
  btn.textContent = "⏳ Salvando...";
  btn.disabled = true;

  const batch = db.batch();
  let notasValidasCount = 0;
  let errosInput = 0;

  alunosTurmaAtual.forEach((aluno, i) => {
    const p = parseFloat(document.getElementById(`port-${i}`).value);
    const m = parseFloat(document.getElementById(`mat-${i}`).value);
    
    if (isNaN(p) && isNaN(m)) return;
    
    if ((!isNaN(p) && (p < 0 || p > 10)) || (!isNaN(m) && (m < 0 || m > 10))) { 
      errosInput++; 
      document.getElementById(`port-${i}`).style.borderColor = "red";
      return; 
    }

    const dados = { 
      ano: ano,
      aluno: aluno.nome, 
      escola: escola, 
      serie: serie, 
      turma: turma, 
      periodo: periodo, 
      avaliadora: usuarioAtual.email, 
      atualizadoEm: firebase.firestore.FieldValue.serverTimestamp() 
    };

    if (!isNaN(p)) dados.notaPort = p;
    if (!isNaN(m)) dados.notaMat = m;
    if (!isNaN(p) && !isNaN(m)) dados.media = (Math.round((p + m) / 2 * 100) / 100).toFixed(1);

    const docRef = aluno.registroId 
      ? db.collection("registros").doc(aluno.registroId) 
      : db.collection("registros").doc();
      
    batch.set(docRef, dados, { merge: true });
    notasValidasCount++;
  });

  if(errosInput > 0) {
    showToast(`Corrija as notas vermelhas (0 a 10).`, "error");
    btn.textContent = "💾 Salvar Todas as Notas";
    btn.disabled = false;
    return;
  }

  if(notasValidasCount === 0) {
    showToast("Nenhuma nota digitada para salvar.", "info");
    btn.textContent = "💾 Salvar Todas as Notas";
    btn.disabled = false;
    return;
  }

  try {
    await batch.commit();
    showToast(`✅ ${notasValidasCount} notas salvas!`, "success");
    carregarAlunosTurma(); 
  } catch (error) {
    console.error("Erro ao salvar:", error);
    showToast("Erro ao conectar com o banco.", "error");
  } finally {
    btn.textContent = "💾 Salvar Todas as Notas";
    btn.disabled = false;
  }
}

function limparNotasTurma() {
  alunosTurmaAtual.forEach((a, i) => {
    const pi = document.getElementById(`port-${i}`);
    const mi = document.getElementById(`mat-${i}`);
    if (pi) pi.value = ""; if (mi) mi.value = "";
    document.getElementById(`media-${i}`).innerHTML = '<span style="color:#ccc;">—</span>';
  });
  atualizarContadoresLancamento();
}

// ==========================================
// COMPARATIVO
// ==========================================
document.getElementById("btn-gerar-comparativo").addEventListener("click", () => {
  const ano = document.getElementById("comp-ano").value;
  const escola = document.getElementById("comp-escola").value;
  const serie  = document.getElementById("comp-serie").value;
  
  function filtrar(p) {
    return todosRegistros.filter(r => {
      const rAno = r.ano || "2026";
      return r.periodo === p && r.notaPort != null &&
             (!ano || rAno === ano) &&
             (!escola || r.escola === escola) && 
             (!serie || r.serie === serie);
    });
  }
  
  const ini = filtrar("inicial"), fin = filtrar("final");
  const series = ["1º Ano", "2º Ano", "3º Ano", "4º Ano", "5º Ano"];
  
  function med(arr, s, c) {
    const it = arr.filter(r => r.serie === s);
    return it.length ? (it.reduce((a, r) => a + r[c], 0) / it.length).toFixed(1) : 0;
  }
  
  ["Port", "Mat"].forEach(d => {
    const c = "nota" + d;
    renderChart("grafico-comp-" + d.toLowerCase(), "bar", series, [
      { label: "Inicial", data: series.map(s => med(ini, s, c)), backgroundColor: "#2e86c1bb" },
      { label: "Final",   data: series.map(s => med(fin, s, c)), backgroundColor: "#27ae60bb" }
    ]);
  });
});

// ==========================================
// ADMIN: ESCOLAS E USUÁRIOS
// ==========================================
document.getElementById('btn-adicionar-escola').addEventListener('click', async () => {
  const input = document.getElementById('admin-nova-escola');
  const nome = input.value.trim();
  if(!nome) return showToast("Digite o nome da escola.", "error");
  
  try {
    await db.collection("escolas").add({ nome });
    showToast("Escola adicionada com sucesso!", "success");
    input.value = "";
    carregarEscolas();
  } catch(e) {
    showToast("Erro ao adicionar escola.", "error");
  }
});

// Modais
document.getElementById('btn-abrir-modal-usuario').addEventListener('click', () => {
  document.getElementById('modal-novo-usuario').classList.remove('oculto');
});
document.getElementById('btn-fechar-modal-usuario').addEventListener('click', () => {
  document.getElementById('modal-novo-usuario').classList.add('oculto');
});

document.getElementById('btn-salvar-usuario').addEventListener('click', async () => {
  const nome = document.getElementById('modal-user-nome').value.trim();
  const email = document.getElementById('modal-user-email').value.trim();
  const cargo = document.getElementById('modal-user-cargo').value;
  
  if(!nome || !email) return showToast("Preencha nome e e-mail.", "error");
  
  const btn = document.getElementById('btn-salvar-usuario');
  btn.textContent = "Salvando...";
  btn.disabled = true;

  try {
    await db.collection("usuarios").add({ nome, email, cargo });
    showToast("Usuário salvo! Crie a senha no Firebase Auth.", "success");
    document.getElementById('modal-novo-usuario').classList.add('oculto');
    carregarUsuariosAdmin();
    
    document.getElementById('modal-user-nome').value = "";
    document.getElementById('modal-user-email').value = "";
  } catch(e) {
    showToast("Erro ao criar usuário.", "error");
  } finally {
    btn.textContent = "Salvar";
    btn.disabled = false;
  }
});

// ==========================================
// ADMIN: TRANSFERÊNCIA INTELIGENTE DE ALUNOS
// ==========================================

// Fluxo de Origem (CASCATA)
document.getElementById('admin-origem-escola').addEventListener('change', async (e) => {
  const esc = e.target.value;
  const selSerie = document.getElementById('admin-origem-serie');
  const selTurma = document.getElementById('admin-origem-turma');
  const selAluno = document.getElementById('admin-origem-aluno');

  selSerie.innerHTML = '<option value="">Carregando...</option>';
  selSerie.disabled = true; selTurma.disabled = true; selAluno.disabled = true;
  document.getElementById('btn-transferir-aluno').disabled = true;

  if(!esc) { selSerie.innerHTML = '<option value="">Aguardando escola...</option>'; return; }

  const snap = await db.collection("alunos").where("escola", "==", esc).where("ativo", "==", true).get();
  const series = [...new Set(snap.docs.map(d => d.data().serie))].sort();

  selSerie.innerHTML = '<option value="">Selecione a Série...</option>';
  series.forEach(s => selSerie.innerHTML += `<option value="${s}">${s}</option>`);
  selSerie.disabled = false;
});

document.getElementById('admin-origem-serie').addEventListener('change', async (e) => {
  const serie = e.target.value;
  const escola = document.getElementById('admin-origem-escola').value;
  const selTurma = document.getElementById('admin-origem-turma');
  const selAluno = document.getElementById('admin-origem-aluno');

  selTurma.innerHTML = '<option value="">Carregando...</option>';
  selTurma.disabled = true; selAluno.disabled = true;
  document.getElementById('btn-transferir-aluno').disabled = true;

  if(!serie) return;

  const snap = await db.collection("alunos").where("escola", "==", escola).where("serie", "==", serie).where("ativo", "==", true).get();
  const turmas = [...new Set(snap.docs.map(d => d.data().turma))].sort();

  selTurma.innerHTML = '<option value="">Selecione a Turma...</option>';
  turmas.forEach(t => selTurma.innerHTML += `<option value="${t}">${t}</option>`);
  selTurma.disabled = false;
});

document.getElementById('admin-origem-turma').addEventListener('change', async (e) => {
  const turma = e.target.value;
  const escola = document.getElementById('admin-origem-escola').value;
  const serie = document.getElementById('admin-origem-serie').value;
  const selAluno = document.getElementById('admin-origem-aluno');

  selAluno.innerHTML = '<option value="">Carregando alunos...</option>';
  selAluno.disabled = true;
  document.getElementById('btn-transferir-aluno').disabled = true;

  if(!turma) return;

  const snap = await db.collection("alunos").where("escola", "==", escola).where("serie", "==", serie).where("turma", "==", turma).where("ativo", "==", true).get();
  
  const alunos = snap.docs.map(d => ({ id: d.id, nome: d.data().nome })).sort((a, b) => a.nome.localeCompare(b.nome));

  selAluno.innerHTML = '<option value="">Selecione o Aluno...</option>';
  alunos.forEach(a => selAluno.innerHTML += `<option value="${a.id}">${a.nome}</option>`);
  selAluno.disabled = false;
});

// Ativa o botão de transferência ao escolher o aluno
document.getElementById('admin-origem-aluno').addEventListener('change', (e) => {
  document.getElementById('btn-transferir-aluno').disabled = !e.target.value;
});

// Botão de Transferir
document.getElementById('btn-transferir-aluno').addEventListener('click', async () => {
  const btn = document.getElementById('btn-transferir-aluno');
  
  // Coleta dados
  const alunoSelect = document.getElementById('admin-origem-aluno');
  const alunoId = alunoSelect.value;
  const alunoNome = alunoSelect.options[alunoSelect.selectedIndex].text; // Pega o nome no texto do select

  const novaEscola = document.getElementById('admin-destino-escola').value;
  const novaSerie = document.getElementById('admin-destino-serie').value;
  const novaTurma = document.getElementById('admin-destino-turma').value.trim().toUpperCase();

  if(!alunoId || !novaEscola || !novaSerie || !novaTurma) {
    return showToast("Preencha todos os campos do Destino.", "error"); 
  }

  btn.textContent = "Transferindo...";
  btn.disabled = true;

  try {
    const batch = db.batch();
    
    // 1. Atualiza o cadastro mestre do aluno (pelo ID)
    const alunoRef = db.collection("alunos").doc(alunoId);
    batch.update(alunoRef, { escola: novaEscola, serie: novaSerie, turma: novaTurma });

    // 2. Atualiza todos os registros de notas desse aluno para refletir o novo local
    const regSnap = await db.collection("registros").where("aluno", "==", alunoNome).get();
    regSnap.docs.forEach(doc => {
        batch.update(doc.ref, { escola: novaEscola, serie: novaSerie, turma: novaTurma });
    });

    await batch.commit();
    showToast(`O aluno(a) ${alunoNome} foi transferido!`, "success");
    
    // Reseta o painel
    document.getElementById('admin-origem-escola').value = "";
    document.getElementById('admin-origem-serie').innerHTML = '<option value="">Aguardando escola...</option>';
    document.getElementById('admin-origem-turma').innerHTML = '<option value="">Aguardando série...</option>';
    document.getElementById('admin-origem-aluno').innerHTML = '<option value="">Aguardando turma...</option>';
    document.getElementById('admin-destino-turma').value = "";
    
  } catch(e) {
    console.error("Erro na transferência:", e);
    showToast("Erro ao processar transferência.", "error");
  } finally {
    btn.textContent = "Realizar Transferência";
    // Deixa desabilitado porque resetamos o formulário
  }
});

// ==========================================
// ADMIN: ZONA DE PERIGO
// ==========================================
document.getElementById("btn-limpar-tudo").addEventListener("click", async () => {
  if (!confirm("⚠️ ATENÇÃO: Isso vai apagar TODAS AS NOTAS do sistema.\nOs alunos continuarão cadastrados.\nTem certeza absoluta?")) return;
  
  showToast("Apagando registros... aguarde.", "info");
  
  try {
    const snap = await db.collection("registros").get();
    const batch = db.batch();
    snap.docs.forEach(d => batch.delete(d.ref));
    await batch.commit();
    showToast("Todos os registros de notas foram apagados.", "success");
  } catch(e) {
    showToast("Erro ao apagar registros.", "error");
  }
});
