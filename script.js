// ===== Referências aos elementos da página =====
const campoTarefa = document.getElementById('campo-tarefa');
const campoPrazo = document.getElementById('campo-prazo');
const botaoAdicionar = document.getElementById('botao-adicionar');
const listaTarefas = document.getElementById('lista-tarefas');
const contadorTarefas = document.getElementById('contador-tarefas');
const botaoTema = document.getElementById('botao-alterar-tema');
const mensagemErro = document.getElementById('mensagem-erro');
const barraProgresso = document.getElementById('barra-progresso');
const textoProgresso = document.getElementById('texto-progresso');
const filtros = document.getElementById('filtros');
const botaoLimpar = document.getElementById('botao-limpar');
const aviso = document.getElementById('aviso');
const avisoTexto = document.getElementById('aviso-texto');
const botaoDesfazer = document.getElementById('botao-desfazer');

// ===== Estado da aplicação =====
// Cada tarefa: { id, texto, concluida, prazo }  (prazo = 'AAAA-MM-DD' ou null)
let tarefas = [];
let filtroAtual = 'todas';   // todas | pendentes | concluidas
let ultimaExcluida = null;   // { tarefa, indice } para o "Desfazer"
let timerAviso = null;

// ===== Persistência (localStorage) =====
function salvarTarefas() {
    try {
        localStorage.setItem('tarefas', JSON.stringify(tarefas));
    } catch (erro) {
        console.error('Não foi possível salvar as tarefas:', erro);
    }
}

function carregarTarefas() {
    try {
        const salvas = JSON.parse(localStorage.getItem('tarefas'));
        if (Array.isArray(salvas)) {
            // Tarefas antigas (sem prazo) continuam funcionando
            tarefas = salvas.map(t => ({ ...t, prazo: t.prazo || null }));
        }
    } catch (erro) {
        tarefas = [];
    }
}

// ===== Tema claro/escuro =====
function aplicarTema(escuro) {
    document.body.classList.toggle('modo-escuro', escuro);
    const icone = botaoTema.querySelector('i');
    icone.className = escuro ? 'fa-solid fa-sun' : 'fa-solid fa-moon';
    try {
        localStorage.setItem('tema', escuro ? 'escuro' : 'claro');
    } catch (erro) {
        console.error('Não foi possível salvar o tema:', erro);
    }
}

function carregarTema() {
    let escuro = false;
    try {
        escuro = localStorage.getItem('tema') === 'escuro';
    } catch (erro) {
        escuro = false;
    }
    aplicarTema(escuro);
}

// ===== Datas e prazos =====
// Data de hoje no formato AAAA-MM-DD (fuso local)
function hojeISO() {
    const d = new Date();
    const mes = String(d.getMonth() + 1).padStart(2, '0');
    const dia = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${mes}-${dia}`;
}

// Converte AAAA-MM-DD em DD/MM/AAAA
function formatarData(iso) {
    const [ano, mes, dia] = iso.split('-');
    return `${dia}/${mes}/${ano}`;
}

// Texto e situação do prazo de uma tarefa
function situacaoPrazo(tarefa) {
    const hoje = hojeISO();
    if (tarefa.concluida) return { texto: `Prazo: ${formatarData(tarefa.prazo)}`, classe: '' };
    if (tarefa.prazo < hoje) return { texto: `Atrasada desde ${formatarData(tarefa.prazo)}`, classe: 'atrasada' };
    if (tarefa.prazo === hoje) return { texto: 'Vence hoje', classe: 'hoje' };
    return { texto: `Prazo: ${formatarData(tarefa.prazo)}`, classe: '' };
}

// ===== Mensagens de erro =====
function mostrarErro(texto) {
    mensagemErro.textContent = texto;
    mensagemErro.hidden = false;
    campoTarefa.classList.add('invalido');
}

function limparErro() {
    mensagemErro.hidden = true;
    campoTarefa.classList.remove('invalido');
    campoPrazo.classList.remove('invalido');
}

// ===== Contador =====
function atualizarContador() {
    const total = tarefas.length;
    const pendentes = tarefas.filter(t => !t.concluida).length;
    const hoje = hojeISO();
    const atrasadas = tarefas.filter(t => !t.concluida && t.prazo && t.prazo < hoje).length;
    const sufixoAtraso = atrasadas > 0 ? ` - ${atrasadas} atrasada${atrasadas === 1 ? '' : 's'}` : '';

    if (total === 0) {
        contadorTarefas.textContent = '0 tarefas na lista';
    } else if (total === 1) {
        contadorTarefas.textContent = (pendentes === 1
            ? '1 tarefa na lista (1 pendente)'
            : '1 tarefa na lista (concluída)') + sufixoAtraso;
    } else {
        contadorTarefas.textContent = `${total} tarefas na lista (${pendentes} pendente${pendentes === 1 ? '' : 's'})${sufixoAtraso}`;
    }
}

// ===== Renderização =====
function criarItem(tarefa) {
    const item = document.createElement('li');
    item.className = 'item-tarefa' + (tarefa.concluida ? ' concluido' : '');
    item.dataset.id = tarefa.id;

    const info = document.createElement('div');
    info.className = 'info-tarefa';

    const texto = document.createElement('span');
    texto.className = 'texto-tarefa';
    texto.textContent = tarefa.texto; // textContent evita injeção de HTML
    texto.title = 'Clique para concluir • duplo clique para editar';
    texto.tabIndex = 0;
    texto.setAttribute('role', 'button');
    info.appendChild(texto);

    if (tarefa.prazo) {
        const situacao = situacaoPrazo(tarefa);
        const prazo = document.createElement('small');
        prazo.className = 'prazo-tarefa ' + situacao.classe;
        prazo.textContent = situacao.texto;
        info.appendChild(prazo);
    }

    const acoes = document.createElement('div');
    acoes.className = 'acoes-tarefa';

    const botaoConcluir = document.createElement('button');
    botaoConcluir.className = 'botao-acao concluir';
    botaoConcluir.setAttribute('aria-label', 'Concluir tarefa');
    botaoConcluir.title = tarefa.concluida ? 'Desfazer' : 'Concluir';
    botaoConcluir.innerHTML = `<i class="fa-solid ${tarefa.concluida ? 'fa-rotate-left' : 'fa-check'}"></i>`;

    const botaoExcluir = document.createElement('button');
    botaoExcluir.className = 'botao-acao excluir';
    botaoExcluir.setAttribute('aria-label', 'Excluir tarefa');
    botaoExcluir.title = 'Excluir';
    botaoExcluir.innerHTML = '<i class="fa-solid fa-trash"></i>';

    acoes.append(botaoConcluir, botaoExcluir);
    item.append(info, acoes);
    return item;
}

// Pendentes primeiro; dentro de cada grupo, prazo mais próximo primeiro (sem prazo vai pro fim)
function ordenar(lista) {
    return [...lista].sort((a, b) =>
        (a.concluida - b.concluida) ||
        (a.prazo || '9999').localeCompare(b.prazo || '9999'));
}

function atualizarProgresso() {
    const total = tarefas.length;
    const feitas = tarefas.filter(t => t.concluida).length;
    const pct = total === 0 ? 0 : Math.round((feitas / total) * 100);
    barraProgresso.style.width = pct + '%';
    textoProgresso.textContent = total > 0 && feitas === total ? 'Tudo concluído! 🎉' : `${pct}% concluído`;
    botaoLimpar.hidden = feitas === 0;
}

function renderizar() {
    listaTarefas.innerHTML = '';

    const visiveis = ordenar(tarefas.filter(t =>
        filtroAtual === 'todas' || (filtroAtual === 'pendentes' ? !t.concluida : t.concluida)));

    if (visiveis.length === 0) {
        const vazio = document.createElement('li');
        vazio.className = 'lista-vazia';
        vazio.textContent = tarefas.length === 0
            ? 'Nenhuma tarefa por aqui. Adicione a primeira!'
            : 'Nenhuma tarefa neste filtro.';
        listaTarefas.appendChild(vazio);
    } else {
        visiveis.forEach(tarefa => listaTarefas.appendChild(criarItem(tarefa)));
    }

    atualizarContador();
    atualizarProgresso();
}

function mostrarAviso(mensagem) {
    avisoTexto.textContent = mensagem;
    aviso.hidden = false;
    clearTimeout(timerAviso);
    timerAviso = setTimeout(() => { aviso.hidden = true; ultimaExcluida = null; }, 5000);
}

function iniciarEdicao(id, span) {
    const tarefa = tarefas.find(t => t.id === id);
    if (!tarefa) return;
    const input = document.createElement('input');
    input.type = 'text';
    input.className = 'edicao';
    input.maxLength = 40;
    input.value = tarefa.texto;
    span.replaceWith(input);
    input.focus();
    input.select();

    let terminou = false;
    const concluirEdicao = () => {
        if (terminou) return;
        terminou = true;
        const novo = input.value.trim();
        const duplicada = tarefas.some(t => t.id !== id && t.texto.toLowerCase() === novo.toLowerCase());
        if (novo && !duplicada) tarefa.texto = novo;
        salvarTarefas();
        renderizar();
    };
    input.addEventListener('blur', concluirEdicao);
    input.addEventListener('keydown', e => {
        if (e.key === 'Enter') concluirEdicao();
        if (e.key === 'Escape') { input.value = tarefa.texto; concluirEdicao(); }
    });
}

// ===== Ações =====
function adicionarTarefa() {
    const texto = campoTarefa.value.trim();

    if (texto === '') {
        mostrarErro('Digite uma tarefa antes de adicionar.');
        campoTarefa.focus();
        return;
    }

    const repetida = tarefas.some(t => t.texto.toLowerCase() === texto.toLowerCase());
    if (repetida) {
        mostrarErro('Essa tarefa já está na lista.');
        campoTarefa.focus();
        return;
    }

    const prazo = campoPrazo.value || null;
    if (prazo && prazo < hojeISO()) {
        mostrarErro('O prazo não pode ser uma data que já passou.');
        campoPrazo.classList.add('invalido');
        campoPrazo.focus();
        return;
    }

    tarefas.push({ id: Date.now(), texto, concluida: false, prazo });
    campoTarefa.value = '';
    campoPrazo.value = '';
    limparErro();
    salvarTarefas();
    renderizar();
    campoTarefa.focus();
}

function alternarConclusao(id) {
    const tarefa = tarefas.find(t => t.id === id);
    if (!tarefa) return;
    tarefa.concluida = !tarefa.concluida;
    salvarTarefas();
    renderizar();
}

function excluirTarefa(id) {
    const indice = tarefas.findIndex(t => t.id === id);
    if (indice === -1) return;
    ultimaExcluida = { tarefa: tarefas[indice], indice };
    tarefas.splice(indice, 1);
    mostrarAviso('Tarefa excluída.');
    salvarTarefas();
    renderizar();
}

// ===== Eventos =====
botaoAdicionar.addEventListener('click', adicionarTarefa);

campoTarefa.addEventListener('keydown', evento => {
    if (evento.key === 'Enter') adicionarTarefa();
});

campoTarefa.addEventListener('input', limparErro);
campoPrazo.addEventListener('input', limparErro);
campoPrazo.min = hojeISO();

// Delegação de eventos: um único listener cuida de todos os itens da lista
listaTarefas.addEventListener('click', evento => {
    const item = evento.target.closest('.item-tarefa');
    if (!item) return;
    const id = Number(item.dataset.id);

    if (evento.target.closest('.excluir')) {
        excluirTarefa(id);
    } else if (evento.target.closest('.concluir') || evento.target.closest('.texto-tarefa')) {
        alternarConclusao(id);
    }
});

botaoTema.addEventListener('click', () => {
    aplicarTema(!document.body.classList.contains('modo-escuro'));
});

filtros.addEventListener('click', evento => {
    const botao = evento.target.closest('.filtro');
    if (!botao) return;
    filtroAtual = botao.dataset.filtro;
    filtros.querySelectorAll('.filtro').forEach(b => b.classList.toggle('ativo', b === botao));
    renderizar();
});

botaoLimpar.addEventListener('click', () => {
    tarefas = tarefas.filter(t => !t.concluida);
    salvarTarefas();
    renderizar();
});

botaoDesfazer.addEventListener('click', () => {
    if (!ultimaExcluida) return;
    tarefas.splice(ultimaExcluida.indice, 0, ultimaExcluida.tarefa);
    ultimaExcluida = null;
    aviso.hidden = true;
    salvarTarefas();
    renderizar();
});

// Duplo clique no texto = editar
listaTarefas.addEventListener('dblclick', evento => {
    const span = evento.target.closest('.texto-tarefa');
    if (!span) return;
    iniciarEdicao(Number(span.closest('.item-tarefa').dataset.id), span);
});

// Teclado: Enter/Espaço no texto = concluir
listaTarefas.addEventListener('keydown', evento => {
    const span = evento.target.closest('.texto-tarefa');
    if (span && (evento.key === 'Enter' || evento.key === ' ')) {
        evento.preventDefault();
        alternarConclusao(Number(span.closest('.item-tarefa').dataset.id));
    }
});

// ===== Inicialização =====
carregarTema();
carregarTarefas();
renderizar();

// Quando o dia vira, atualiza os prazos ("vence hoje" -> "atrasada")
let diaAtual = hojeISO();
setInterval(() => {
    if (hojeISO() !== diaAtual) {
        diaAtual = hojeISO();
        campoPrazo.min = diaAtual;
        renderizar();
    }
}, 60000);
