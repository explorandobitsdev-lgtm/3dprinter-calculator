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
    }
};

// ============ STATE ============
const state = {
    machines: [],
    selectedMachineId: null,
    filaments: [],
    editingMachineId: null
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
        desconto: lerNum('desconto')
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

    const kwhConsumido = (inputs.watts / 1000) * inputs.tempo;

    document.getElementById('rCustoFilamento').textContent = formatBRL(resultado.custoFilamentos);
    document.getElementById('rCustoEnergia').textContent =
        `${formatBRL(resultado.custoEnergia)} (${formatKwh(kwhConsumido)})`;
    document.getElementById('rCustoExtra').textContent = formatBRL(resultado.custoExtra);
    document.getElementById('rCustoTotal').textContent = formatBRL(resultado.custoTotal);
    document.getElementById('rPrecoBruto').textContent = formatBRL(resultado.precoBruto);
    document.getElementById('rDesconto').textContent = `- ${formatBRL(resultado.valorDesconto)}`;
    document.getElementById('rPrecoVenda').textContent = formatBRL(resultado.precoVenda);
    document.getElementById('rLucro').textContent =
        `${formatBRL(resultado.lucro.valor)} (${formatPercent(resultado.lucro.percent)})`;
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

function inicializar() {
    carregarOuSemearMaquinas();
    semearFilamentos();
    renderMachineSelect();
    renderSlots();

    document.getElementById('machineSelect').addEventListener('change', (e) => {
        selecionarMaquina(e.target.value);
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

    ['tempo', 'precoKwh', 'custoExtra', 'margem', 'desconto'].forEach((id) => {
        document.getElementById(id).addEventListener('input', atualizar);
    });

    document.querySelectorAll('.quick-buttons button').forEach((btn) => {
        btn.addEventListener('click', () => {
            document.getElementById('margem').value = btn.dataset.margem;
            atualizar();
        });
    });

    atualizar();
}

document.addEventListener('DOMContentLoaded', inicializar);
