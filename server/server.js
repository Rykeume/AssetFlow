require('dotenv').config();

const express = require('express');
const app = express();

// Configurações do servidor
app.use(express.json());
app.use(express.static('public'));

// Rota de teste
app.get('/api/teste', (req, res) => {
    res.json({
        mensagem: 'AssetFlow está no ar!'
    });
});

// Rotas de ativos
const rotasAtivos = require('./routes/ativos');

app.use('/api/ativos', rotasAtivos);

// Inicialização do servidor
const PORTA = process.env.PORT || 3000;

app.listen(PORTA, () => {
    console.log(`Servidor rodando em http://localhost:${PORTA}`);
});
