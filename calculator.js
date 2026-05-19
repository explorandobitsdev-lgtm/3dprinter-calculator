/**
 * Lógica de cálculo - independente da interface.
 * Suporta múltiplos filamentos (estilo AMS).
 */
const Calculator = {
    custoFilamento(pesoGramas, precoPorKg) {
        return (pesoGramas / 1000) * precoPorKg;
    },

    /**
     * Soma o custo de todos os filamentos usados na impressão.
     * filamentos = [{ peso, precoPorKg, ... }, ...]
     */
    custoFilamentos(filamentos) {
        return filamentos.reduce(
            (total, f) => total + this.custoFilamento(f.peso || 0, f.precoPorKg || 0),
            0
        );
    },

    pesoTotal(filamentos) {
        return filamentos.reduce((total, f) => total + (f.peso || 0), 0);
    },

    custoEnergia(watts, horas, custoKwh) {
        return (watts / 1000) * horas * custoKwh;
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
     * Calcula tudo. Recebe um objeto de inputs e devolve resultado completo.
     * inputs = {
     *   filamentos: [{ cor, nome, peso, precoPorKg }, ...],
     *   watts, tempo, precoKwh, custoExtra, margem, desconto
     * }
     */
    calcular(inputs) {
        const filamento = this.custoFilamentos(inputs.filamentos);
        const energia = this.custoEnergia(inputs.watts, inputs.tempo, inputs.precoKwh);
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
            custoFilamentos: filamento,
            detalheFilamentos,
            pesoTotal: this.pesoTotal(inputs.filamentos),
            custoEnergia: energia,
            custoExtra: inputs.custoExtra,
            custoTotal: total,
            precoBruto,
            valorDesconto,
            precoVenda: venda,
            lucro
        };
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
