var firebaseConfig = {
  apiKey: "AIzaSyAZd5yyiJCXju1mKjAR16R5dpf15yxqQK4",
  authDomain: "sarem-f2539.firebaseapp.com",
  projectId: "sarem-f2539",
  storageBucket: "sarem-f2539.firebasestorage.app",
  messagingSenderId: "787644291903",
  appId: "1:787644291903:web:e227ec78b1885b7506518a"
};

firebase.initializeApp(firebaseConfig);
var auth = firebase.auth();
var db = firebase.firestore();

var ESCOLAS = [
  "EM Comecinho de Vida",
  "EM Dom Bosco",
  "EM Elias Carrijo de Sousa",
  "EM Maria Aparecida Almeida Paniago", // Nome corrigido aqui
  "EM Maria Eduarda Condinho Filgueiras",
  "EM Otalécio Alves Irineu",
  "EM Padre Maximinio",
  "EM Professor Juarez Távora de Carvalho",
  "Escola Municipal Professor Salviano Neves Amorim", // Nome corrigido aqui
  "EM Santo Antônio",
  "EM Tonico Corredeira",
  "EM Reverendo Eudóxio",
  "EM Castelo Branco",
  "Escola Américo Caetano",
  "Escola Farroupilha",
  "Escola Farroupilha Extensão",
  "Escola Antonio Alves",
  "Escola Gustavo Alves",
  "Escola Antonio Messias",
  "Escola Caindão",
  "Escola Salto",
  "Escola Morro Dois Irmãos",
  "Escola Pinguela"
];

var ADMINEMAIL = "admin@sarem.com";
var usuarioAtual = null;
var todosRegistros = [];
var registrosFiltrados = [];
var charts = {};
var alunosTurmaAtual = [];

function arred(n) {
  return (Math.round(n * 10) / 10).toFixed(1);
}

function renderChart(id, type, labels, datasets) {
  var ctx = document.getElementById(id);
  if (!ctx) return;
  if (charts[id]) charts[id].destroy();
  charts[id] = new Chart(ctx, {
    type: type,
    data: { labels: labels, datasets: datasets },
    options: { responsive: true, maintainAspectRatio: false }
  });
}

// AUTH
auth.onAuthStateChanged(function(user) {
  if (user) {
    usuarioAtual = user;
    document.getElementById("pagina-login").classList.add("oculto");
    document.getElementById("pagina-app").classList.remove("oculto");
    document.getElementById("header-usuario").textContent = user.email;
    if (user.email === ADMINEMAIL) document.getElementById("btn-admin").classList.remove("oculto");
    popularSelectsEscolas();
    carregarRegistros();
  } else {
    document.getElementById("pagina-login").classList.remove("oculto");
    document.getElementById("pagina-app").classList.add("oculto");
  }
});

// LOGIN / LOGOUT
document.getElementById("btn-login").addEventListener("click", function() {
  var email = document.getElementById("login-email").value;
  var senha = document.getElementById("login-senha").value;
  document.getElementById("login-erro").textContent = "";
  auth.signInWithEmailAndPassword(email, senha).catch(function() {
    document.getElementById("login-erro").textContent = "E-mail ou senha inválidos.";
  });
});
document.getElementById("login-senha").addEventListener("keydown", function(e) {
  if (e.key === "Enter") document.getElementById("btn-login").click();
});
document.getElementById("btn-logout").addEventListener("click", function() { auth.signOut(); });

// NAVEGAÇÃO
document.querySelectorAll(".nav-btn").forEach(function(btn) {
  btn.addEventListener("click", function() {
    ["dashboard","lancamento","comparativo","admin"].forEach(function(s) {
      document.getElementById("secao-" + s).classList.add("oculto");
    });
    document.querySelectorAll(".nav-btn").forEach(function(b) { b.classList.remove("ativo"); });
    document.getElementById("secao-" + btn.getAttribute("data-secao")).classList.remove("oculto");
    btn.classList.add("ativo");
  });
});

// POPULAR SELECTS ESCOLAS
function popularSelectsEscolas() {
  ["filtro-escola","l-escola","comp-escola"].forEach(function(id) {
    var el = document.getElementById(id);
    if (!el) return;
    var primeira = el.options[0] ? el.options[0].outerHTML : "<option value=''>Selecione...</option>";
    el.innerHTML = primeira;
    ESCOLAS.sort().forEach(function(e) {
      var opt = document.createElement("option");
      opt.value = e; opt.textContent = e;
      el.appendChild(opt);
    });
  });
}

// FIRESTORE - CARREGAR REGISTROS
function carregarRegistros() {
  db.collection("registros").orderBy("criadoEm","desc").onSnapshot(function(snap) {
    todosRegistros = snap.docs.map(function(d) { return Object.assign({id: d.id}, d.data()); });
    registrosFiltrados = todosRegistros.slice();
    atualizarDashboard(registrosFiltrados);
    popularFiltroTurma(registrosFiltrados);
  });
}

function popularFiltroTurma(dados) {
  var sel = document.getElementById("filtro-turma");
  var atual = sel.value;
  sel.innerHTML = "<option value=''>Todas as Turmas</option>";
  var turmas = [...new Set(dados.map(function(r){return r.turma;}).filter(Boolean))].sort();
  turmas.forEach(function(t) {
    var o = document.createElement("option");
    o.value = t; o.textContent = t;
    sel.appendChild(o);
  });
  if (atual) sel.value = atual;
}

// FILTROS
document.getElementById("btn-aplicar-filtros").addEventListener("click", function() {
  var escola = document.getElementById("filtro-escola").value;
  var serie  = document.getElementById("filtro-serie").value;
  var turma  = document.getElementById("filtro-turma").value;
  var aval   = document.getElementById("filtro-avaliadora").value;
  var per    = document.getElementById("filtro-periodo").value;
  registrosFiltrados = todosRegistros.filter(function(r) {
    return (!escola || r.escola === escola) &&
           (!serie  || r.serie  === serie)  &&
           (!turma  || r.turma  === turma)  &&
           (!aval   || r.avaliadora === aval) &&
           (!per    || r.periodo === per);
  });
  atualizarDashboard(registrosFiltrados);
  renderizarTabela(registrosFiltrados, true);
});

document.getElementById("btn-limpar-filtros").addEventListener("click", function() {
  ["filtro-escola","filtro-serie","filtro-turma","filtro-avaliadora","filtro-periodo"].forEach(function(id) {
    document.getElementById(id).value = "";
  });
  registrosFiltrados = todosRegistros.slice();
  atualizarDashboard(registrosFiltrados);
  renderizarTabela(registrosFiltrados, false);
});

// PESQUISA GERAL
document.getElementById("btn-pesquisa").addEventListener("click", function() {
  var termo = document.getElementById("pesquisa-geral").value.toLowerCase().trim();
  if (!termo) { registrosFiltrados = todosRegistros.slice(); atualizarDashboard(registrosFiltrados); return; }
  registrosFiltrados = todosRegistros.filter(function(r) {
    return (r.aluno||"").toLowerCase().includes(termo) ||
           (r.escola||"").toLowerCase().includes(termo) ||
           (r.turma||"").toLowerCase().includes(termo) ||
           (r.serie||"").toLowerCase().includes(termo) ||
           (r.periodo||"").toLowerCase().includes(termo);
  });
  atualizarDashboard(registrosFiltrados);
  renderizarTabela(registrosFiltrados, true);
});
document.getElementById("btn-limpar-pesquisa").addEventListener("click", function() {
  document.getElementById("pesquisa-geral").value = "";
  registrosFiltrados = todosRegistros.slice();
  atualizarDashboard(registrosFiltrados);
  renderizarTabela(registrosFiltrados, false);
});
document.getElementById("pesquisa-geral").addEventListener("keydown", function(e) {
  if (e.key === "Enter") document.getElementById("btn-pesquisa").click();
});

// DASHBOARD
function atualizarDashboard(dados) {
  var comNota = dados.filter(function(r) { return r.notaPort != null && r.notaMat != null; });
  var total = comNota.length;
  var mediaPort = total > 0 ? arred(comNota.reduce(function(s,r){return s+r.notaPort;},0)/total) : "-";
  var mediaMat  = total > 0 ? arred(comNota.reduce(function(s,r){return s+r.notaMat;},0)/total) : "-";
  var escolas = new Set(dados.map(function(r){return r.escola;})).size;
  document.getElementById("card-total").textContent = total;
  document.getElementById("card-media-port").textContent = mediaPort;
  document.getElementById("card-media-mat").textContent = mediaMat;
  document.getElementById("card-escolas").textContent = escolas;
  renderizarTabela(dados, false);
  renderizarTop3(comNota);
  renderizarPizzas(comNota);
}

function renderizarTop3(dados) {
  var grupos = {};
  dados.forEach(function(r) {
    if (!grupos[r.escola]) grupos[r.escola] = {port:[], mat:[]};
    grupos[r.escola].port.push(r.notaPort);
    grupos[r.escola].mat.push(r.notaMat);
  });
  var lista = Object.keys(grupos).map(function(e) {
    var gp = grupos[e].port, gm = grupos[e].mat;
    return {
      escola: e,
      mp: gp.reduce(function(a,b){return a+b;},0)/gp.length,
      mm: gm.reduce(function(a,b){return a+b;},0)/gm.length
    };
  });
  function renderEl(elId, campo) {
    var sorted = lista.slice().sort(function(a,b){return b[campo]-a[campo];}).slice(0,3);
    var el = document.getElementById(elId);
    if (!el) return;
    el.innerHTML = "";
    if (!sorted.length) { el.innerHTML = "<div style='text-align:center;color:var(--text-light);padding:20px'>Sem dados</div>"; return; }
    var medals = ["🥇","🥈","🥉"];
    sorted.forEach(function(e, i) {
      var val = arred(e[campo]);
      var bc = parseFloat(val)>=7?"badge-verde":parseFloat(val)>=5?"badge-amarelo":"badge-vermelho";
      var div = document.createElement("div");
      div.className = "top3-item";
      div.innerHTML = "<span class=\"top3-medal\">"+medals[i]+"</span>"
        +"<span class=\"top3-nome\">"+e.escola+"</span>"
        +"<span class=\"top3-nota\"><span class=\"badge "+bc+"\">"+val+"</span></span>";
      el.appendChild(div);
    });
  }
  renderEl("top3-port","mp");
  renderEl("top3-mat","mm");
}

function renderizarPizzas(dados) {
  var faixas = ["0–3","3–5","5–7","7–9","9–10"];
  var cores = ["#e74c3c","#e67e22","#f1c40f","#2ecc71","#27ae60"];
  function contar(arr) {
    var r=[0,0,0,0,0];
    arr.forEach(function(n){if(n<3)r[0]++;else if(n<5)r[1]++;else if(n<7)r[2]++;else if(n<9)r[3]++;else r[4]++;});
    return r;
  }
  function pizza(id, notas) {
    var ctx = document.getElementById(id);
    if (!ctx) return;
    if (charts[id]) charts[id].destroy();
    charts[id] = new Chart(ctx, {
      type:"pie",
      data:{labels:faixas, datasets:[{data:contar(notas), backgroundColor:cores}]},
      options:{responsive:true, maintainAspectRatio:false, plugins:{legend:{position:"right"}}}
    });
  }
  pizza("grafico-dist-port", dados.map(function(r){return r.notaPort;}));
  pizza("grafico-dist-mat",  dados.map(function(r){return r.notaMat;}));
}

function renderizarTabela(dados, mostrar) {
  var card = document.getElementById("card-resultados");
  var tbody = document.getElementById("tabela-corpo");
  var vazio = document.getElementById("tabela-vazia");
  var count = document.getElementById("resultados-count");
  tbody.innerHTML = "";
  if (!mostrar) { if(card) card.classList.add("oculto"); return; }
  if (card) card.classList.remove("oculto");
  var comNota = dados.filter(function(r){return r.notaPort!=null;});
  if (count) count.textContent = comNota.length + " aluno(s)";
  if (comNota.length === 0) { vazio.classList.remove("oculto"); return; }
  vazio.classList.add("oculto");
  comNota.forEach(function(r) {
    var media = parseFloat(r.media);
    var bc = media>=7?"badge-verde":media>=5?"badge-amarelo":"badge-vermelho";
    var tr = document.createElement("tr");
    tr.innerHTML = "<td style=\"font-weight:600\">"+r.aluno+"</td>"
      +"<td style=\"font-size:12px\">"+r.escola+"</td>"
      +"<td>"+r.serie+"</td><td>"+r.turma+"</td>"
      +"<td>"+(r.periodo==="inicial"?"Inicial":"Final")+"</td>"
      +"<td style=\"text-align:center\">"+r.notaPort.toFixed(1)+"</td>"
      +"<td style=\"text-align:center\">"+r.notaMat.toFixed(1)+"</td>"
      +"<td style=\"text-align:center\"><span class=\"badge "+bc+"\">"+media.toFixed(1)+"</span></td>";
    tbody.appendChild(tr);
  });
}

// LANÇAMENTOS
document.getElementById("l-escola").addEventListener("change", carregarSeriesLancamento);
document.getElementById("l-serie").addEventListener("change", carregarTurmasLancamento);
document.getElementById("btn-carregar-alunos").addEventListener("click", carregarAlunosTurma);
document.getElementById("btn-salvar-turma").addEventListener("click", salvarTurma);
document.getElementById("btn-limpar-notas").addEventListener("click", limparNotasTurma);

function carregarSeriesLancamento() {
  var escola = document.getElementById("l-escola").value;
  var selSerie = document.getElementById("l-serie");
  var selTurma = document.getElementById("l-turma");
  selSerie.innerHTML = '<option value="">Selecione a série...</option>';
  selTurma.innerHTML = '<option value="">Selecione a turma...</option>';
  if (!escola) return;
  db.collection("alunos").where("escola","==",escola).where("ativo","==",true).get().then(function(snap) {
    var series = [];
    snap.docs.forEach(function(d) { var s = d.data().serie; if (!series.includes(s)) series.push(s); });
    series.sort().forEach(function(s) {
      var opt = document.createElement("option");
      opt.value = s; opt.textContent = s;
      selSerie.appendChild(opt);
    });
  });
}

function carregarTurmasLancamento() {
  var escola = document.getElementById("l-escola").value;
  var serie = document.getElementById("l-serie").value;
  var selTurma = document.getElementById("l-turma");
  selTurma.innerHTML = '<option value="">Selecione a turma...</option>';
  if (!escola || !serie) return;
  db.collection("alunos").where("escola","==",escola).where("serie","==",serie).where("ativo","==",true).get().then(function(snap) {
    var turmas = [];
    snap.docs.forEach(function(d) { var t = d.data().turma; if (!turmas.includes(t)) turmas.push(t); });
    turmas.sort().forEach(function(t) {
      var opt = document.createElement("option");
      opt.value = t; opt.textContent = t;
      selTurma.appendChild(opt);
    });
  });
}

function carregarAlunosTurma() {
  var escola = document.getElementById("l-escola").value;
  var serie = document.getElementById("l-serie").value;
  var turma = document.getElementById("l-turma").value;
  var periodo = document.getElementById("l-periodo").value;
  var wrapper = document.getElementById("lancamento-tabela-wrapper");
  var vazio = document.getElementById("lancamento-vazio");
  if (!escola || !serie || !turma) { alert("Selecione escola, série e turma."); return; }

  db.collection("alunos").where("escola","==",escola).where("serie","==",serie).where("turma","==",turma).where("ativo","==",true).get().then(function(alunosSnap) {
    if (alunosSnap.empty) {
      vazio.textContent = "Nenhum aluno encontrado para essa turma.";
      wrapper.classList.add("oculto");
      vazio.classList.remove("oculto");
      return;
    }
    db.collection("registros").where("escola","==",escola).where("periodo","==",periodo).get().then(function(regSnap) {
      var nomesDaTurma = new Set(alunosSnap.docs.map(function(d){ return d.data().nome; }));
      var regPorNome = {};
      regSnap.docs.forEach(function(d) {
        var r = d.data();
        if (nomesDaTurma.has(r.aluno) && !regPorNome[r.aluno]) {
          regPorNome[r.aluno] = Object.assign({id: d.id}, r);
        }
      });

      alunosTurmaAtual = alunosSnap.docs.map(function(d) {
        var a = d.data();
        var reg = regPorNome[a.nome] || null;
        return {
          alunoId: d.id,
          nome: a.nome,
          registroId: reg ? reg.id : null,
          notaPort: reg ? reg.notaPort : null,
          notaMat: reg ? reg.notaMat : null,
          media: reg ? reg.media : null
        };
      }).sort(function(a,b){ return a.nome.localeCompare(b.nome); });

      var periodLabel = periodo === "inicial" ? "Diagnóstico Inicial" : "Diagnóstico Final";
      document.getElementById("lancamento-turma-titulo").textContent = escola + " — " + serie + " / " + turma + " — " + periodLabel;
      document.getElementById("lancamento-contador").textContent = alunosTurmaAtual.length + " alunos";

      var tbody = document.getElementById("lancamento-tabela-corpo");
      tbody.innerHTML = "";
      alunosTurmaAtual.forEach(function(aluno, i) {
        var pv = aluno.notaPort != null ? aluno.notaPort : "";
        var mv = aluno.notaMat  != null ? aluno.notaMat  : "";
        var media = aluno.media != null ? parseFloat(aluno.media) : null;
        var bc = media != null ? (media>=7?"badge-verde":media>=5?"badge-amarelo":"badge-vermelho") : "";
        var ms = media != null ? '<span class="badge ' + bc + '">' + media.toFixed(1) + '</span>' : '<span style="color:#ccc;">—</span>';
        var tr = document.createElement("tr");
        tr.innerHTML = '<td style="color:var(--text-light);font-size:12px;">' + (i+1) + '</td>' +
          '<td style="font-weight:500;">' + aluno.nome + '</td>' +
          '<td style="text-align:center;"><input type="number" id="port-' + i + '" value="' + pv + '" min="0" max="10" step="0.1" class="input-nota" placeholder="—"></td>' +
          '<td style="text-align:center;"><input type="number" id="mat-' + i + '" value="' + mv + '" min="0" max="10" step="0.1" class="input-nota" placeholder="—"></td>' +
          '<td style="text-align:center;" id="media-' + i + '">' + ms + '</td>';
        tbody.appendChild(tr);
        document.getElementById("port-" + i).addEventListener("input", function(){ atualizarMedia(i); });
        document.getElementById("mat-"  + i).addEventListener("input", function(){ atualizarMedia(i); });
      });

      wrapper.classList.remove("oculto");
      vazio.classList.add("oculto");
      document.getElementById("lancamento-turma-msg").textContent = "";
    });
  });
}

function atualizarMedia(i) {
  var p = parseFloat(document.getElementById("port-"+i).value);
  var m = parseFloat(document.getElementById("mat-"+i).value);
  var cell = document.getElementById("media-"+i);
  if (!isNaN(p) && !isNaN(m)) {
    var med = Math.round((p+m)/2 * 10) / 10;
    var bc = med>=7?"badge-verde":med>=5?"badge-amarelo":"badge-vermelho";
    cell.innerHTML = '<span class="badge ' + bc + '">' + med.toFixed(1) + '</span>';
  } else {
    cell.innerHTML = '<span style="color:#ccc;">—</span>';
  }
}

function salvarTurma() {
  var escola = document.getElementById("l-escola").value;
  var serie  = document.getElementById("l-serie").value;
  var turma  = document.getElementById("l-turma").value;
  var periodo = document.getElementById("l-periodo").value;
  var msg = document.getElementById("lancamento-turma-msg");
  msg.style.color = "var(--primary)"; msg.textContent = "⏳ Salvando...";
  var salvos = 0, erros = 0;
  var promessas = [];

  alunosTurmaAtual.forEach(function(aluno, i) {
    var p = parseFloat(document.getElementById("port-"+i).value);
    var m = parseFloat(document.getElementById("mat-"+i).value);
    if (isNaN(p) && isNaN(m)) return;
    if ((!isNaN(p)&&(p<0||p>10)) || (!isNaN(m)&&(m<0||m>10))) { erros++; return; }
    var dados = { aluno: aluno.nome, escola: escola, serie: serie, turma: turma, periodo: periodo, avaliadora: usuarioAtual.email, criadoEm: firebase.firestore.FieldValue.serverTimestamp() };
    if (!isNaN(p)) dados.notaPort = p;
    if (!isNaN(m)) dados.notaMat = m;
    if (!isNaN(p) && !isNaN(m)) dados.media = (Math.round((p+m)/2 * 100) / 100).toFixed(1);
    var prom;
    if (aluno.registroId) {
      prom = db.collection("registros").doc(aluno.registroId).update(dados).then(function(){ salvos++; }).catch(function(){ erros++; });
    } else {
      prom = db.collection("registros").add(dados).then(function(ref){ alunosTurmaAtual[i].registroId = ref.id; salvos++; }).catch(function(){ erros++; });
    }
    promessas.push(prom);
  });

  Promise.all(promessas).then(function() {
    if (erros > 0) {
      msg.style.color = "var(--danger)";
      msg.textContent = "⚠️ " + salvos + " notas salvas. " + erros + " com erro.";
    } else {
      msg.style.color = "var(--success)";
      msg.textContent = "✅ " + salvos + " notas salvas com sucesso!";
    }
    setTimeout(function(){ msg.textContent = ""; }, 4000);
  });
}

function limparNotasTurma() {
  alunosTurmaAtual.forEach(function(a, i) {
    var pi = document.getElementById("port-"+i);
    var mi = document.getElementById("mat-"+i);
    if (pi) pi.value = ""; if (mi) mi.value = "";
    document.getElementById("media-"+i).innerHTML = '<span style="color:#ccc;">—</span>';
  });
}

// COMPARATIVO
document.getElementById("btn-gerar-comparativo").addEventListener("click", function() {
  var escola = document.getElementById("comp-escola").value;
  var serie  = document.getElementById("comp-serie").value;
  function filtrar(p) {
    return todosRegistros.filter(function(r) {
      return r.periodo === p && r.notaPort != null &&
             (!escola || r.escola === escola) && (!serie || r.serie === serie);
    });
  }
  var ini = filtrar("inicial"), fin = filtrar("final");
  var series = ["1º Ano","2º Ano","3º Ano","4º Ano","5º Ano"];
  function med(arr, s, c) {
    var it = arr.filter(function(r){ return r.serie === s; });
    return it.length ? (it.reduce(function(a,r){ return a+r[c]; },0)/it.length).toFixed(1) : 0;
  }
  ["Port","Mat"].forEach(function(d) {
    var c = "nota" + d;
    renderChart("grafico-comp-" + d.toLowerCase(), "bar", series, [
      {label:"Inicial", data: series.map(function(s){ return med(ini,s,c); }), backgroundColor:"#2e86c1bb"},
      {label:"Final",   data: series.map(function(s){ return med(fin,s,c); }), backgroundColor:"#27ae60bb"}
    ]);
  });
});

// ADMIN
document.getElementById("btn-limpar-tudo").addEventListener("click", function() {
  if (!confirm("ATENÇÃO: Isso vai apagar TODOS os registros. Confirma?")) return;
  db.collection("registros").get().then(function(snap) {
    var batch = db.batch();
    snap.docs.forEach(function(d){ batch.delete(d.ref); });
    return batch.commit();
  }).then(function(){ alert("Todos os registros foram excluídos."); });
});