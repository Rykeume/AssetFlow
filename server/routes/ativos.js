const express = require('express');
const router = express.Router();
const db = require('../config/db');

router.get('/', async (req, res) => {
  try {
    const [linhas] = await db.query('SELECT * FROM ativos ORDER BY criado_em DESC');
    res.json(linhas);
  } catch (erro) {
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao buscar ativos' });
  }
});

// Campos que deixam o cadastro "completo", conforme o tipo (Fase 2)
const CAMPOS_COMPLETOS = {
  celular: ['marca', 'modelo', 'numero_serie', 'imei'],
  notebook: ['marca', 'modelo', 'numero_serie', 'service_tag']
};

// Transforma texto vazio em null, para o banco guardar "sem valor"
const limpar = (valor) => {
  if (valor === undefined || valor === null) return null;
  const texto = String(valor).trim();
  return texto === '' ? null : texto;
};

router.post('/', async (req, res) => {
  const corpo = req.body ?? {};
  const tipo = corpo.tipo;

  if (!['celular', 'notebook'].includes(tipo)) {
    return res.status(400).json({ erro: "O tipo deve ser 'celular' ou 'notebook'" });
  }

  const dados = {
    marca: limpar(corpo.marca),
    modelo: limpar(corpo.modelo),
    numero_serie: limpar(corpo.numero_serie),
    imei: limpar(corpo.imei),
    service_tag: limpar(corpo.service_tag),
    hostname: limpar(corpo.hostname),
    linha_chip_vinculado: limpar(corpo.linha_chip_vinculado),
    condicao: limpar(corpo.condicao),
    observacoes: limpar(corpo.observacoes)
  };

  const completo = CAMPOS_COMPLETOS[tipo].every((campo) => dados[campo] !== null);

  const conexao = await db.getConnection();
  try {
    await conexao.beginTransaction();

    // FOR UPDATE trava a linha do contador: dois cadastros ao mesmo tempo não pegam o mesmo número
    const [[contador]] = await conexao.query(
      'SELECT prefixo, proximo_numero FROM contadores_patrimonio WHERE tipo = ? FOR UPDATE',
      [tipo]
    );
    const patrimonio = `${contador.prefixo}-${String(contador.proximo_numero).padStart(4, '0')}`;

    await conexao.query(
      `INSERT INTO ativos
        (patrimonio, tipo, marca, modelo, numero_serie, imei, service_tag, hostname,
         linha_chip_vinculado, condicao, observacoes, cadastro_completo)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [patrimonio, tipo, dados.marca, dados.modelo, dados.numero_serie, dados.imei,
       dados.service_tag, dados.hostname, dados.linha_chip_vinculado, dados.condicao,
       dados.observacoes, completo]
    );

    await conexao.query(
      'UPDATE contadores_patrimonio SET proximo_numero = proximo_numero + 1 WHERE tipo = ?',
      [tipo]
    );

    await conexao.commit();
    res.status(201).json({ patrimonio, cadastro_completo: completo });
  } catch (erro) {
    await conexao.rollback();
    console.error(erro);
    res.status(500).json({ erro: 'Erro ao cadastrar ativo' });
  } finally {
    conexao.release();
  }
});

module.exports = router;