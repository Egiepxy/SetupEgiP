SetupEgiP V7 - OIL (Brent) / MEXC

CORREÇÃO PRINCIPAL DA V7
- Histórico agora é solicitado à API de FUTUROS correta da MEXC: https://contract.mexc.com
- Mantém WebSocket wss://contract.mexc.com/edge para preço/candles ao vivo.
- O servidor tenta uma fonte alternativa apenas como fallback e mostra erro detalhado quando nenhuma fonte entrega candles.
- A tela informa a quantidade de candles carregada por timeframe.

COMO EXECUTAR
1. Extraia este ZIP em um servidor com Node.js 18 ou superior.
2. Execute: npm start
3. Abra no navegador o endereço do servidor/porta configurada.
4. Não abra somente public/index.html como arquivo local; o histórico depende de /api/kline no servidor.

Timeframes: 15m, 1H, 4H e 1D.
Contrato: UKOIL_USDT (OIL Brent).
