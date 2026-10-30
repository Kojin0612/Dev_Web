<?php
header('Content-Type: text/html; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit('Use o formulário de edição para atualizar um livro.');
}

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
$titulo = $_POST['titulo'] ?? '';
$autor = $_POST['autor'] ?? '';
$ano_publicacao = $_POST['ano_publicacao'] ?? '';
$genero = $_POST['genero'] ?? '';
$isbn = $_POST['isbn'] ?? '';
$quantidade = $_POST['quantidade'] ?? '';

if (!$id || $id < 1) {
    http_response_code(400);
    exit('ID inválido. Volte à listagem.');
}

// O ISBN não está nesta lista de campos obrigatórios porque ele é opcional.
if (!is_string($titulo) || !is_string($autor) || !is_string($ano_publicacao) || !is_string($genero) || !is_string($isbn) || !is_string($quantidade)
    || trim($titulo) === '' || trim($autor) === '' || trim($ano_publicacao) === '' || trim($genero) === '' || trim($quantidade) === '') {
    http_response_code(400);
    exit('Preencha todos os campos obrigatórios. Volte ao formulário de edição.');
}

// Limpa os espaços das pontas dos textos.
$titulo = trim($titulo);
$autor = trim($autor);
$ano_publicacao = trim($ano_publicacao);
$genero = trim($genero);

// ISBN vazio vira NULL de verdade (sem aspas), que é o que o banco espera.
$isbn = trim($isbn);
if ($isbn === '') {
    $isbn = null;
}

// A coluna ano_publicacao é DATE (AAAA-MM-DD, formato do input type="date").
$data = DateTime::createFromFormat('Y-m-d', $ano_publicacao);
if (!$data || $data->format('Y-m-d') !== $ano_publicacao) {
    http_response_code(400);
    exit('Data de publicação inválida. Volte ao formulário de edição.');
}

// A coluna quantidade é um número inteiro; o formulário exige pelo menos 1.
$quantidade = filter_var($quantidade, FILTER_VALIDATE_INT);
if ($quantidade === false || $quantidade < 1) {
    http_response_code(400);
    exit('Informe uma quantidade de exemplares válida (mínimo 1). Volte ao formulário de edição.');
}

// Tamanhos máximos definidos no banco.
if (mb_strlen($titulo) > 100 || mb_strlen($autor) > 100
    || mb_strlen($genero) > 50 || ($isbn !== null && mb_strlen($isbn) > 30)) {
    http_response_code(400);
    exit('Algum campo ultrapassou o tamanho máximo. Volte ao formulário de edição.');
}

require __DIR__ . '/conexao.php';

try {
    // Transação: atualiza o livro e grava o histórico juntos, ou não grava nada.
    $conexao->begin_transaction();

    // 1) Busca a quantidade ATUAL do livro (FOR UPDATE trava a linha até o fim da transação).
    $consulta = $conexao->prepare('SELECT quantidade FROM livros WHERE id = ? FOR UPDATE');
    $consulta->bind_param('i', $id);
    $consulta->execute();
    $livro = $consulta->get_result()->fetch_assoc();
    $consulta->close();

    if (!$livro) {
        $conexao->rollback();
        $conexao->close();
        http_response_code(404);
        exit('Livro não encontrado. Volte à listagem.');
    }
    $quantidade_anterior = (int) $livro['quantidade'];

    // 2) Atualiza o livro. 7 lugares (?) = 7 variáveis no bind_param, na mesma ordem.
    $sql = 'UPDATE livros SET titulo = ?, autor = ?, ano_publicacao = ?, genero = ?, isbn = ?, quantidade = ? WHERE id = ?';
    $comando = $conexao->prepare($sql);
    // s = texto (a data vai como texto), i = número inteiro.
    $comando->bind_param('sssssii', $titulo, $autor, $ano_publicacao, $genero, $isbn, $quantidade, $id);
    $comando->execute();
    $comando->close();

    // 3) Só registra no histórico se a quantidade realmente mudou.
    if ($quantidade !== $quantidade_anterior) {
        // Aumentou = entrada; diminuiu = saída. A coluna quantidade guarda o tamanho da mudança.
        $tipo = $quantidade > $quantidade_anterior ? 'entrada' : 'saida';
        $diferenca = abs($quantidade - $quantidade_anterior);

        $sqlHistorico = 'INSERT INTO historico (livro_id, tipo, quantidade, quantidade_anterior, quantidade_atual)
                         VALUES (?, ?, ?, ?, ?)';
        $comandoHistorico = $conexao->prepare($sqlHistorico);
        $comandoHistorico->bind_param('isiii', $id, $tipo, $diferenca, $quantidade_anterior, $quantidade);
        $comandoHistorico->execute();
        $comandoHistorico->close();
    }

    $conexao->commit();
    $conexao->close();
} catch (mysqli_sql_exception $erro) {
    $conexao->rollback();
    error_log($erro->getMessage());
    http_response_code(500);
    exit('Não foi possível atualizar o livro. Consulte o log de erros do Apache.');
}

// Volta para a página do catálogo; o script.js recarrega a tabela sozinho.
header('Location: consulta.html', true, 303);
exit;