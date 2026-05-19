/**
 * Lógica de cálculo - independente da interface.
 * Pode ser reutilizada em qualquer front-end ou Node.js.
 */
const Calculator = {
    custoFilamento(pesoGramas, precoPorKg) {
        return (pesoGramas / 1000) * precoPorKg;
    },

    custoEnergia(watts, horas, custoKwh) {
        return (watts / 1000) * horas * custoKwh;
    },

    custoTotal(filamento, energia, extra = 0) {
        return filamento + energia + extra;
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
     * Calcula tudo de uma vez. Recebe um objeto de inputs e devolve o resultado completo.
     */
    calcular(inputs) {
        const filamento = this.custoFilamento(inputs.peso, inputs.precoFilamento);
        const energia = this.custoEnergia(inputs.watts, inputs.tempo, inputs.precoKwh);
        const total = this.custoTotal(filamento, energia, inputs.custoExtra);
        const precoBruto = total * (1 + inputs.margem / 100);
        const venda = this.precoVenda(total, inputs.margem, inputs.desconto);
        const valorDesconto = precoBruto - venda;
        const lucro = this.lucro(venda, total);

        return {
            custoFilamento: filamento,
            custoEnergia: energia,
            custoExtra: inputs.custoExtra,
            custoTotal: total,
            precoBruto,
            valorDesconto,
            precoVenda: venda,
            lucro
        };
    },

    /**
     * Avalia a saúde do lucro e devolve um alerta, se necessário.
     */
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

// Permite uso em Node.js (CLI/testes), opcional.
if (typeof module !== 'undefined') {
    module.exports = Calculator;
}
