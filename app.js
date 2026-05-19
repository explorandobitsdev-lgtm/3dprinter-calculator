/**
 * Camada de UI - liga os inputs do DOM à lógica de Calculator.
 */
const formatBRL = (valor) =>
    valor.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

const formatPercent = (valor) =>
    `${valor.toLocaleString('pt-BR', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}%`;

const inputIds = [
    'peso', 'precoFilamento', 'tempo', 'watts',
    'precoKwh', 'custoExtra', 'margem', 'desconto'
];

const MARGENS_SUGERIDAS = [
    { nome: 'Baixa', valor: 30 },
    { nome: 'Média', valor: 50 },
    { nome: 'Alta', valor: 100 },
    { nome: 'Premium', valor: 150 }
];

function lerInputs() {
    const lerNum = (id) => parseFloat(document.getElementById(id).value) || 0;
    return {
        peso: lerNum('peso'),
        precoFilamento: lerNum('precoFilamento'),
        tempo: lerNum('tempo'),
        watts: lerNum('watts'),
        precoKwh: lerNum('precoKwh'),
        custoExtra: lerNum('custoExtra'),
        margem: lerNum('margem'),
        desconto: lerNum('desconto')
    };
}

function renderResultado(resultado) {
    document.getElementById('rCustoFilamento').textContent = formatBRL(resultado.custoFilamento);
    document.getElementById('rCustoEnergia').textContent = formatBRL(resultado.custoEnergia);
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

    if (!aviso) {
        el.classList.add('hidden');
        return;
    }

    el.className = `alerta ${aviso.nivel}`;
    el.textContent = aviso.mensagem;
    el.classList.remove('hidden');
}

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
    const inputs = lerInputs();
    const resultado = Calculator.calcular(inputs);
    renderResultado(resultado);
    renderAlerta(resultado.lucro.percent);
    renderTabelaMargens(inputs);
}

function inicializar() {
    inputIds.forEach((id) => {
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
