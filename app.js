/**
 * Camada de UI - liga DOM à lógica de Calculator.
 * Inclui:
 *   - CRUD de impressoras (localStorage)
 *   - Slots AMS dinâmicos
 *   - Atualização em tempo real
 */

// ============ STORAGE ============
const STORAGE_KEY_MACHINES = '3dcalc.machines';
const STORAGE_KEY_SELECTED = '3dcalc.selectedMachine';
const STORAGE_KEY_PIECES = '3dcalc.pieces';
const STORAGE_KEY_CLIENT = '3dcalc.client';
const STORAGE_KEY_VALIDADE = '3dcalc.validade';

const Storage = {
    loadMachines() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_MACHINES);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    },
    saveMachines(machines) {
        localStorage.setItem(STORAGE_KEY_MACHINES, JSON.stringify(machines));
    },
    loadSelectedId() {
        return localStorage.getItem(STORAGE_KEY_SELECTED);
    },
    saveSelectedId(id) {
        localStorage.setItem(STORAGE_KEY_SELECTED, id);
    },
    loadPieces() {
        try {
            const raw = localStorage.getItem(STORAGE_KEY_PIECES);
            return raw ? JSON.parse(raw) : null;
        } catch { return null; }
    },
    savePieces(pieces) {
        localStorage.setItem(STORAGE_KEY_PIECES, JSON.stringify(pieces));
    },
    loadClient() { return localStorage.getItem(STORAGE_KEY_CLIENT) || ''; },
    saveClient(name) { localStorage.setItem(STORAGE_KEY_CLIENT, name); },
    loadValidade() { return localStorage.getItem(STORAGE_KEY_VALIDADE) || '7 dias'; },
    saveValidade(v) { localStorage.setItem(STORAGE_KEY_VALIDADE, v); }
};

// ============ STATE ============
const state = {
    machines: [],
    selectedMachineId: null,
    filaments: [],
    editingMachineId: null,
    pieces: []
};

const DEFAULT_COLORS = ['#ef4444', '#22c55e', '#facc15', '#38bdf8', '#a855f7', '#ec4899', '#f97316', '#14b8a6'];

function uid() {
    return 'm_' + Math.random().toString(36).slice(2, 10);
}

// ============ FORMATTERS ============
const formatBRL = (v) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const formatPercent = (v) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;
const formatKwh = (v) => `${v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 3 })} kWh`;

// ============ MÁQUINAS ============
function getSelectedMachine() {
    return state.machines.find((m) => m.id === state.selectedMachineId) || state.machines[0] || null;
}

function renderMachineSelect() {
    const select = document.getElementById('machineSelect');
    select.innerHTML = '';
    state.machines.forEach((m) => {
        const opt = document.createElement('option');
        opt.value = m.id;
        opt.textContent = m.name;
        if (m.id === state.selectedMachineId) opt.selected = true;
        select.appendChild(opt);
    });

    const machine = getSelectedMachine();
    const info = document.getElementById('machineInfo');
    if (machine) {
        info.textContent = `• ${machine.watts} W • ${machine.slots} slots AMS`;
    } else {
        info.textContent = 'Nenhuma impressora cadastrada';
    }
}

function selecionarMaquina(id) {
    state.selectedMachineId = id;
    Storage.saveSelectedId(id);
    const machine = getSelectedMachine();
    if (machine) {
        ajustarSlotsParaMaquina(machine);
    }
    renderMachineSelect();
    atualizar();
}

function ajustarSlotsParaMaquina(machine) {
    while (state.filaments.length > machine.slots) state.filaments.pop();
    while (state.filaments.length < Math.min(1, machine.slots)) {
        adicionarSlot(false);
    }
    renderSlots();
}

function abrirFormMaquina(machine = null) {
    state.editingMachineId = machine ? machine.id : null;
    document.getElementById('machineFormTitle').textContent =
        machine ? `Editar: ${machine.name}` : 'Nova impressora';
    document.getElementById('machineName').value = machine ? machine.name : '';
    document.getElementById('machineWatts').value = machine ? machine.watts : 150;
    document.getElementById('machineSlots').value = machine ? machine.slots : 4;
    document.getElementById('machineForm').classList.remove('hidden');
}

function fecharFormMaquina() {
    document.getElementById('machineForm').classList.add('hidden');
    state.editingMachineId = null;
}

function salvarMaquina() {
    const name = document.getElementById('machineName').value.trim();
    const watts = parseFloat(document.getElementById('machineWatts').value) || 0;
    const slots = parseInt(document.getElementById('machineSlots').value, 10) || 1;

    if (!name) {
        alert('Informe um nome para a impressora.');
        return;
    }

    if (state.editingMachineId) {
        const m = state.machines.find((x) => x.id === state.editingMachineId);
        Object.assign(m, { name, watts, slots });
    } else {
        const novo = { id: uid(), name, watts, slots };
        state.machines.push(novo);
        state.selectedMachineId = novo.id;
        Storage.saveSelectedId(novo.id);
    }

    Storage.saveMachines(state.machines);
    fecharFormMaquina();

    const machine = getSelectedMachine();
    if (machine) ajustarSlotsParaMaquina(machine);

    renderMachineSelect();
    atualizar();
}

function removerMaquina() {
    const machine = getSelectedMachine();
    if (!machine) return;
    if (!confirm(`Remover "${machine.name}"?`)) return;

    state.machines = state.machines.filter((m) => m.id !== machine.id);
    state.selectedMachineId = state.machines[0]?.id || null;
    Storage.saveMachines(state.machines);
    if (state.selectedMachineId) Storage.saveSelectedId(state.selectedMachineId);

    renderMachineSelect();
    const novaSelecionada = getSelectedMachine();
    if (novaSelecionada) ajustarSlotsParaMaquina(novaSelecionada);
    atualizar();
}

// ============ SLOTS AMS ============
function adicionarSlot(render = true) {
    const machine = getSelectedMachine();
    if (machine && state.filaments.length >= machine.slots) {
        alert(`A impressora "${machine.name}" tem apenas ${machine.slots} slots.`);
        return;
    }

    const idx = state.filaments.length;
    state.filaments.push({
        cor: DEFAULT_COLORS[idx % DEFAULT_COLORS.length],
        nome: '',
        peso: 0,
        precoPorKg: 120
    });

    if (render) {
        renderSlots();
        atualizar();
    }
}

function removerSlot(index) {
    if (state.filaments.length <= 1) {
        alert('Você precisa ter pelo menos 1 filamento.');
        return;
    }
    state.filaments.splice(index, 1);
    renderSlots();
    atualizar();
}

function renderSlots() {
    const container = document.getElementById('amsContainer');
    const template = document.getElementById('slotTemplate');
    container.innerHTML = '';

    state.filaments.forEach((f, idx) => {
        const node = template.content.firstElementChild.cloneNode(true);
        node.dataset.slotIndex = idx;
        node.querySelector('.slot-number').textContent = `Slot ${idx + 1}`;

        const corInput = node.querySelector('.slot-color-input');
        const nomeInput = node.querySelector('.slot-name');
        const pesoInput = node.querySelector('.slot-peso');
        const precoInput = node.querySelector('.slot-preco');
        const removeBtn = node.querySelector('.slot-remove');

        corInput.value = f.cor;
        nomeInput.value = f.nome;
        pesoInput.value = f.peso;
        precoInput.value = f.precoPorKg;

        corInput.addEventListener('input', () => { f.cor = corInput.value; atualizar(); });
        nomeInput.addEventListener('input', () => { f.nome = nomeInput.value; atualizar(); });
        pesoInput.addEventListener('input', () => { f.peso = parseFloat(pesoInput.value) || 0; atualizar(); });
        precoInput.addEventListener('input', () => { f.precoPorKg = parseFloat(precoInput.value) || 0; atualizar(); });
        removeBtn.addEventListener('click', () => removerSlot(idx));

        container.appendChild(node);
    });
}

// ============ CÁLCULO E RENDERIZAÇÃO ============
function lerInputsGerais() {
    const machine = getSelectedMachine();
    const lerNum = (id) => parseFloat(document.getElementById(id).value) || 0;
    return {
        filamentos: state.filaments,
        watts: machine ? machine.watts : 0,
        tempo: lerNum('tempo'),
        precoKwh: lerNum('precoKwh'),
        custoExtra: lerNum('custoExtra'),
        margem: lerNum('margem'),
        desconto: lerNum('desconto'),
        quantidade: Math.max(1, parseInt(document.getElementById('quantidade').value, 10) || 1)
    };
}

function renderBreakdownFilamentos(detalhe) {
    const container = document.getElementById('filamentsBreakdown');
    container.innerHTML = '';

    detalhe.forEach((f, idx) => {
        if ((f.peso || 0) === 0) return;
        const line = document.createElement('div');
        line.className = 'filament-line';
        line.innerHTML = `
            <div class="filament-line-left">
                <span class="filament-chip" style="background:${f.cor}"></span>
                <span>${f.nome || `Slot ${idx + 1}`} <small style="color:var(--text-muted)">${f.peso}g</small></span>
            </div>
            <span>${formatBRL(f.custo)}</span>
        `;
        container.appendChild(line);
    });
}

function renderResultado(resultado, inputs) {
    renderBreakdownFilamentos(resultado.detalheFilamentos);

    document.getElementById('rPesoTotal').textContent =
        resultado.pesoTotal > 0 ? `(${resultado.pesoTotal.toFixed(1)} g)` : '';

    document.getElementById('rCustoFilamento').textContent = formatBRL(resultado.custoFilamentos);

    const energiaFormula = `${inputs.watts}W × ${inputs.tempo}h × R$${inputs.precoKwh}/kWh`;
    document.getElementById('rCustoEnergia').innerHTML =
        `${formatBRL(resultado.custoEnergia)}<small>${energiaFormula} = ${formatKwh(resultado.kwhConsumido)}</small>`;

    document.getElementById('rCustoExtra').textContent = formatBRL(resultado.custoExtra);
    document.getElementById('rCustoTotal').textContent = formatBRL(resultado.custoTotal);
    document.getElementById('rPrecoBruto').textContent = formatBRL(resultado.precoBruto);
    document.getElementById('rDesconto').textContent = `- ${formatBRL(resultado.valorDesconto)}`;
    document.getElementById('rPrecoVenda').textContent = formatBRL(resultado.precoVenda);
    document.getElementById('rLucro').textContent =
        `${formatBRL(resultado.lucro.valor)} (${formatPercent(resultado.lucro.percent)})`;

    renderPorPeca(resultado);
}

function renderPorPeca(resultado) {
    const box = document.getElementById('porPecaBox');
    if (!box) return;

    if (resultado.quantidade <= 1) {
        box.classList.add('hidden');
        return;
    }

    box.classList.remove('hidden');
    document.getElementById('pPecaQtd').textContent = `${resultado.quantidade} peças`;
    document.getElementById('pPecaCusto').textContent = formatBRL(resultado.porPeca.custoTotal);
    document.getElementById('pPecaVenda').textContent = formatBRL(resultado.porPeca.precoVenda);
    document.getElementById('pPecaLucro').textContent = formatBRL(resultado.porPeca.lucro);
    document.getElementById('pPecaPeso').textContent = `${resultado.porPeca.peso.toFixed(1)} g`;
}

function renderAlerta(lucroPercent) {
    const el = document.getElementById('alerta');
    const aviso = Calculator.avaliarLucro(lucroPercent);
    if (!aviso) { el.classList.add('hidden'); return; }
    el.className = `alerta ${aviso.nivel}`;
    el.textContent = aviso.mensagem;
}

const MARGENS_SUGERIDAS = [
    { nome: 'Baixa', valor: 30 },
    { nome: 'Média', valor: 50 },
    { nome: 'Alta', valor: 100 },
    { nome: 'Premium', valor: 150 }
];

function renderTabelaMargens(inputs) {
    const tbody = document.getElementById('tabelaMargens');
    const margemAtual = inputs.margem;
    tbody.innerHTML = '';

    MARGENS_SUGERIDAS.forEach(({ nome, valor }) => {
        const sim = Calculator.calcular({ ...inputs, margem: valor, desconto: 0 });
        const ativa = Math.abs(margemAtual - valor) < 0.01;
        const tr = document.createElement('tr');
        if (ativa) tr.classList.add('active');
        tr.innerHTML = `
            <td>${nome} (${valor}%)</td>
            <td>${formatBRL(sim.precoVenda)}</td>
            <td>${formatBRL(sim.lucro.valor)}</td>
        `;
        tbody.appendChild(tr);
    });
}

function atualizar() {
    const inputs = lerInputsGerais();
    const resultado = Calculator.calcular(inputs);
    renderResultado(resultado, inputs);
    renderAlerta(resultado.lucro.percent);
    renderTabelaMargens(inputs);
}

// ============ ORÇAMENTO ============
function novaPeca() {
    return {
        nome: '',
        descricao: '',
        horas: 2,
        gramas: 50,
        precoFilamento: 120,
        precoVenda: 0,
        qtd: 1
    };
}

function adicionarPeca() {
    const peca = novaPeca();
    state.pieces.push(peca);
    Storage.savePieces(state.pieces);
    renderBudget();
}

function removerPeca(index) {
    state.pieces.splice(index, 1);
    Storage.savePieces(state.pieces);
    renderBudget();
}

function limparOrcamento() {
    if (state.pieces.length === 0) return;
    if (!confirm('Remover todas as peças do orçamento?')) return;
    state.pieces = [];
    Storage.savePieces(state.pieces);
    renderBudget();
}

function calcularPeca(peca) {
    const machine = getSelectedMachine();
    const watts = machine ? machine.watts : 0;
    const precoKwh = parseFloat(document.getElementById('precoKwh').value) || 0;
    const margem = parseFloat(document.getElementById('margem').value) || 0;
    return Calculator.peca({
        gramas: peca.gramas,
        precoFilamento: peca.precoFilamento,
        horas: peca.horas,
        watts,
        precoKwh,
        margem
    });
}

function renderBudget() {
    const tbody = document.getElementById('budgetTbody');
    const template = document.getElementById('pieceTemplate');
    tbody.innerHTML = '';

    state.pieces.forEach((peca, idx) => {
        const row = template.content.firstElementChild.cloneNode(true);
        const $ = (cls) => row.querySelector('.' + cls);

        $('p-nome').value = peca.nome;
        $('p-desc').value = peca.descricao;
        $('p-horas').value = peca.horas;
        $('p-gramas').value = peca.gramas;
        $('p-preco-fil').value = peca.precoFilamento;
        $('p-venda').value = peca.precoVenda;
        $('p-qtd').value = peca.qtd;

        const calc = calcularPeca(peca);
        $('p-custo').textContent = formatBRL(calc.custo);
        $('p-sugestao').textContent = formatBRL(calc.sugestao);

        // Se preço de venda ainda não foi definido, usa a sugestão como padrão
        if (!peca.precoVenda || peca.precoVenda === 0) {
            peca.precoVenda = parseFloat(calc.sugestao.toFixed(2));
            $('p-venda').value = peca.precoVenda;
        }

        $('p-subtotal').textContent = formatBRL(peca.precoVenda * peca.qtd);

        const bindText = (cls, prop) => {
            $(cls).addEventListener('input', (e) => {
                peca[prop] = e.target.value;
                Storage.savePieces(state.pieces);
            });
        };
        const bindNum = (cls, prop, recalc = false) => {
            $(cls).addEventListener('input', (e) => {
                peca[prop] = parseFloat(e.target.value) || 0;
                if (recalc) {
                    // Recalcula sugestão e atualiza preço de venda se ele estava igual à sugestão anterior
                    const antesCalc = calcularPeca(peca);
                    $('p-custo').textContent = formatBRL(antesCalc.custo);
                    $('p-sugestao').textContent = formatBRL(antesCalc.sugestao);
                }
                $('p-subtotal').textContent = formatBRL((peca.precoVenda || 0) * (peca.qtd || 0));
                Storage.savePieces(state.pieces);
                atualizarTotalOrcamento();
            });
        };

        bindText('p-nome', 'nome');
        bindText('p-desc', 'descricao');
        bindNum('p-horas', 'horas', true);
        bindNum('p-gramas', 'gramas', true);
        bindNum('p-preco-fil', 'precoFilamento', true);
        bindNum('p-venda', 'precoVenda');
        bindNum('p-qtd', 'qtd');

        row.querySelector('.p-remove').addEventListener('click', () => removerPeca(idx));

        tbody.appendChild(row);
    });

    atualizarTotalOrcamento();
}

function totalOrcamento() {
    return state.pieces.reduce(
        (total, p) => total + (p.precoVenda || 0) * (p.qtd || 0),
        0
    );
}

function atualizarTotalOrcamento() {
    document.getElementById('budgetTotal').textContent = formatBRL(totalOrcamento());
}

function recalcularTodasPecas() {
    // Quando watts/precoKwh/margem mudam, recalcular custos exibidos
    const rows = document.querySelectorAll('#budgetTbody .piece-row');
    rows.forEach((row, idx) => {
        const peca = state.pieces[idx];
        if (!peca) return;
        const calc = calcularPeca(peca);
        row.querySelector('.p-custo').textContent = formatBRL(calc.custo);
        row.querySelector('.p-sugestao').textContent = formatBRL(calc.sugestao);
    });
}

// ============ PDF (via print) ============
function gerarPDF() {
    if (state.pieces.length === 0) {
        alert('Adicione pelo menos uma peça ao orçamento antes de gerar o PDF.');
        return;
    }

    const hoje = new Date();
    const dataFmt = hoje.toLocaleDateString('pt-BR');
    const horaFmt = hoje.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });

    document.getElementById('quoteDate').textContent = dataFmt;
    document.getElementById('quoteClient').textContent =
        document.getElementById('clientName').value.trim() || '—';
    document.getElementById('quoteValidadePrint').textContent =
        document.getElementById('quoteValidade').value.trim() || '—';
    document.getElementById('quoteGeneratedAt').textContent = `${dataFmt} às ${horaFmt}`;

    const tbody = document.getElementById('quoteTbody');
    tbody.innerHTML = '';
    let total = 0;

    state.pieces.forEach((p, idx) => {
        if (!p.nome && !p.descricao) return;
        const subtotal = (p.precoVenda || 0) * (p.qtd || 0);
        total += subtotal;
        const tr = document.createElement('tr');
        tr.innerHTML = `
            <td>${idx + 1}</td>
            <td>
                <strong>${escapeHtml(p.nome || 'Peça sem nome')}</strong>
                ${p.descricao ? `<span class="item-desc">${escapeHtml(p.descricao)}</span>` : ''}
            </td>
            <td>${p.qtd}</td>
            <td>${formatBRL(p.precoVenda || 0)}</td>
            <td>${formatBRL(subtotal)}</td>
        `;
        tbody.appendChild(tr);
    });

    document.getElementById('quoteTotal').textContent = formatBRL(total);

    window.print();
}

function escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
}

// ============ INICIALIZAÇÃO ============
function carregarOuSemearMaquinas() {
    const saved = Storage.loadMachines();
    if (saved && saved.length) {
        state.machines = saved;
    } else {
        state.machines = [
            { id: uid(), name: 'Bambu X1C (AMS)', watts: 150, slots: 4 },
            { id: uid(), name: 'Ender 3 (cor única)', watts: 120, slots: 1 }
        ];
        Storage.saveMachines(state.machines);
    }
    const savedId = Storage.loadSelectedId();
    state.selectedMachineId = savedId && state.machines.find((m) => m.id === savedId)
        ? savedId
        : state.machines[0].id;
}

function semearFilamentos() {
    const machine = getSelectedMachine();
    state.filaments = [
        { cor: '#ef4444', nome: 'PLA Vermelho', peso: 30, precoPorKg: 120 }
    ];
    if (machine && machine.slots >= 2) {
        state.filaments.push({ cor: '#22c55e', nome: 'PLA Verde', peso: 20, precoPorKg: 120 });
    }
}

function carregarOrcamento() {
    const saved = Storage.loadPieces();
    state.pieces = saved && Array.isArray(saved) ? saved : [];
    document.getElementById('clientName').value = Storage.loadClient();
    document.getElementById('quoteValidade').value = Storage.loadValidade();
}

function atualizarTudo() {
    atualizar();
    recalcularTodasPecas();
}

function inicializar() {
    carregarOuSemearMaquinas();
    semearFilamentos();
    carregarOrcamento();
    renderMachineSelect();
    renderSlots();
    renderBudget();

    document.getElementById('machineSelect').addEventListener('change', (e) => {
        selecionarMaquina(e.target.value);
        recalcularTodasPecas();
    });

    document.getElementById('btnNovaMaquina').addEventListener('click', () => abrirFormMaquina());
    document.getElementById('btnEditarMaquina').addEventListener('click', () => {
        const m = getSelectedMachine();
        if (m) abrirFormMaquina(m);
    });
    document.getElementById('btnRemoverMaquina').addEventListener('click', removerMaquina);
    document.getElementById('btnSalvarMaquina').addEventListener('click', salvarMaquina);
    document.getElementById('btnCancelarMaquina').addEventListener('click', fecharFormMaquina);

    document.getElementById('btnAddSlot').addEventListener('click', () => adicionarSlot());

    ['tempo', 'custoExtra', 'desconto', 'quantidade'].forEach((id) => {
        document.getElementById(id).addEventListener('input', atualizar);
    });
    // Estes três afetam também o orçamento
    ['precoKwh', 'margem'].forEach((id) => {
        document.getElementById(id).addEventListener('input', atualizarTudo);
    });

    document.querySelectorAll('.quick-buttons button').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.getElementById('margem').value = btn.dataset.margem;
            atualizarTudo();
        });
    });

    // Orçamento
    document.getElementById('btnAddPiece').addEventListener('click', adicionarPeca);
    document.getElementById('btnClearBudget').addEventListener('click', limparOrcamento);
    document.getElementById('btnGeneratePDF').addEventListener('click', gerarPDF);
    document.getElementById('clientName').addEventListener('input', (e) => {
        Storage.saveClient(e.target.value);
    });
    document.getElementById('quoteValidade').addEventListener('input', (e) => {
        Storage.saveValidade(e.target.value);
    });

    atualizar();
}

document.addEventListener('DOMContentLoaded', inicializar);
