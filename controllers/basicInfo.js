const novadax = require("./exchangeAPI");
const axios = require("axios");

// PRICE AND VOLUME INFOS

// no auth required
const getTradingSymbol = async (req, res) => {
    const data = await getTradingSymbolBack(req.query);
    res.json(data);
};

async function getTradingSymbolBack(payload = {}) {
    // n1
    const symbol = payload.symbol || "BTC/BRL";
    const data = await novadax.fetchTicker(symbol);

    return data.info;
}
// getTradingSymbolBack()
// .then(console.log)

async function getTradingSymbols(payload = {}) {
    const baseCurrency = payload.baseCurrency || "BRL";

    const { data: res } = await axios.get(
        "https://api.novadax.com/v1/common/symbols"
    );

    return res.data
        .filter((coin) => coin.symbol.includes(baseCurrency))
        .map((coin) => ({
            minOrderValue: coin.minOrderValue, // min value of origin currency like BRL or it is can be the percantage value.
            minOrderAmount: coin.minOrderAmount, // min quantity of a coin
            symbol: coin.symbol,
        }));
}
// getTradingSymbols()
// .then(console.log)

module.exports = {
    getTradingSymbol,
    getTradingSymbolBack,
    getTradingSymbols,
};

/* COMMENTS
n1:
{ ask: '175076.79', (preço de demanda que pode comprar - compra)
baseVolume24h: '84.04181154',
bid: '174716.57', (preço de oferta que pode vender - venda)
high24h: '175931.98',
lastPrice: '174869.62',
low24h: '28292.05760813',
open24h: '168202.91',
quoteVolume24h: '14416507.42',
symbol: 'BTC_BRL',
timestamp: '1625319694049' }
*/

/*
Para evitar a perda dos ativos, não compartilhe suas chaves com ninguém. Caso você tenha esquecido sua Secret Key, delete a respetiva API Key e crie uma nova.
 */
// Permissões: Leitura e consulta; Transação; Saque em criptos
//

/*
//Endpoints públicos
Podem ser acessados sem necessidade de autenticação para obter:
Dados de mercado
Informações básicas

Endpoints privados
Precisam ser acessados com autenticação para gerenciar:

Ordens
Conta
//
//*/

/* TAXA LIMITE DE REQUISIÇÕES
Endpoints públicos: ao máximo 60 REQUISIÇÕES a cada segundo por IP;
Endpoints privados: até 20 REQUISIÇÕES por segundo para cada API AccessKey.
Ao exceder o limite, é retornado o CÓDIGO DE ERRO A1004.
 */

/* AUTENTICAÇÃO
A fim de proteger a comunicação da API contra alterações não autorizadas, todas as chamadas de endpoints privados precisam ser autenticadas com sua API AccessKey.

Estrutura das requisições válidas

É necessário fazer uma chamada para a URL api.novadax.com, por exemplo, https://api.novadax.com/v1/common/symbols.

AccessKeyId: sua API AccessKey

Signature Method: utilize HMAC-SHA256 hash
Timestamp: a hora atual do sistema em milissegundos, por exemplo, 1564988445199.
Parâmetros obrigatórios e opcionais: existem parâmetros obrigatórios e opcionais para acessar cada endpoint. Você pode verificar o significado desses parâmetros na descrição de cada endpoint.
Signature: mensagem criptografada para prevenir transportes e alterações não autorizadas.
 */
