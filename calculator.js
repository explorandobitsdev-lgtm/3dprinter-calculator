/**
 * Lógica de cálculo - independente da interface.
 * Suporta múltiplos filamentos (estilo AMS) e quantidade de peças por job.
 */
const Calculator = {
    custoFilamento(pesoGramas, precoPorKg) {
        return (pesoGramas / 1000) * precoPorKg;
    },

    custoFilamentos(filamentos) {
        return filamentos.reduce(
            (total, f) => total + this.custoFilamento(f.peso || 0, f.precoPorKg || 0),
            0
        );
    },

    pesoTotal(filamentos) {
        return filamentos.reduce((total, f) => total + (f.peso || 0), 0);
    },

    /**
     * Custo de energia em R$.
     * Fórmula: (W/1000) * h * R$/kWh
     * Ex: 150W * 12h * 0,95 R$/kWh => 0,15 kW * 12h = 1,80 kWh * 0,95 = R$ 1,71
     */
    custoEnergia(watts, horas, custoKwh) {
        return (watts / 1000) * horas * custoKwh;
    },

    kwhConsumido(watts, horas) {
        return (watts / 1000) * horas;
    },

    custoTotal(filamentos, energia, extra = 0) {
        return filamentos + energia + extra;
    },

    precoVenda(custoTotal, margemPercent, descontoPercent = 0) {
        const precoBruto = custoTotal * (1 + margemPercent / 100);
        return precoBruto * (1 - descontoPercent / 100);
    },

    lucro(precoVenda, custoTotal) {
        const valor = precoVenda - custoTotal;
        const percent = custoTotal > 0 ? (valor / custoTotal) * 100 : 0;
        return { valor, percent };
    },

    /**
     * Calcula tudo.
     * inputs = {
     *   filamentos: [{cor, nome, peso, precoPorKg}],
     *   watts, tempo, precoKwh, custoExtra, margem, desconto, quantidade
     * }
     * Devolve totais do job + valores por peça.
     */
    calcular(inputs) {
        const qtd = Math.max(1, inputs.quantidade || 1);
        const filamento = this.custoFilamentos(inputs.filamentos);
        const energia = this.custoEnergia(inputs.watts, inputs.tempo, inputs.precoKwh);
        const kwh = this.kwhConsumido(inputs.watts, inputs.tempo);
        const total = this.custoTotal(filamento, energia, inputs.custoExtra);
        const precoBruto = total * (1 + inputs.margem / 100);
        const venda = this.precoVenda(total, inputs.margem, inputs.desconto);
        const valorDesconto = precoBruto - venda;
        const lucro = this.lucro(venda, total);

        const detalheFilamentos = inputs.filamentos.map((f) => ({
            ...f,
            custo: this.custoFilamento(f.peso || 0, f.precoPorKg || 0)
        }));

        return {
            quantidade: qtd,
            custoFilamentos: filamento,
            detalheFilamentos,
            pesoTotal: this.pesoTotal(inputs.filamentos),
            custoEnergia: energia,
            kwhConsumido: kwh,
            custoExtra: inputs.custoExtra,
            custoTotal: total,
            precoBruto,
            valorDesconto,
            precoVenda: venda,
            lucro,
            porPeca: {
                custoTotal: total / qtd,
                precoVenda: venda / qtd,
                lucro: lucro.valor / qtd,
                peso: this.pesoTotal(inputs.filamentos) / qtd
            }
        };
    },

    /**
     * Calcula custo e sugestão para uma única peça do orçamento.
     * peca = { gramas, precoFilamento, horas, watts, precoKwh, margem }
     */
    peca({ gramas, precoFilamento, horas, watts, precoKwh, margem }) {
        const cFilamento = this.custoFilamento(gramas || 0, precoFilamento || 0);
        const cEnergia = this.custoEnergia(watts || 0, horas || 0, precoKwh || 0);
        const custo = cFilamento + cEnergia;
        const sugestao = custo * (1 + (margem || 0) / 100);
        return { custoFilamento: cFilamento, custoEnergia: cEnergia, custo, sugestao };
    },

    avaliarLucro(lucroPercent) {
        if (lucroPercent < 0) {
            return { nivel: 'danger', mensagem: 'Atenção: você está vendendo no PREJUÍZO!' };
        }
        if (lucroPercent < 20) {
            return { nivel: 'warning', mensagem: 'Lucro muito baixo - considere aumentar a margem ou reduzir o desconto.' };
        }
        if (lucroPercent < 40) {
            return { nivel: 'warning', mensagem: 'Lucro modesto. Margens recomendadas começam em 50%.' };
        }
        return null;
    }
};

if (typeof module !== 'undefined') {
    module.exports = Calculator;
}
