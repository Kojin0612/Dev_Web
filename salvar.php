<?php
header('Content-Type: text/html; charset=utf-8');

// Este arquivo recebe os dados enviados pelo formulário de cadastro de livros.
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit('Acesse cadastro.html e envie o formulário para cadastrar um livro.');
}

// O name="..." de cada campo no HTML corresponde a $_POST['...'] aqui no PHP
// (e cada um deles corresponde a uma coluna da tabela livros).
$titulo         = trim($_POST['titulo'] ?? '');
$autor          = trim($_POST['autor'] ?? '');
$anoPublicacao  = trim($_POST['ano_publicacao'] ?? '');
$genero         = trim($_POST['genero'] ?? '');
$isbn           = trim($_POST['isbn'] ?? '');
$quantidade     = filter_var($_POST['quantidade'] ?? '', FILTER_VALIDATE_INT);

// ISBN é opcional: se vier vazio, grava NULL no banco.
if ($isbn === '') {
    $isbn = null;
}

// Verificação dos campos obrigatórios.
if ($titulo === '' || $autor === '' || $anoPublicacao === '' || $genero === '') {
    http_response_code(400);
    exit('Preencha todos os campos obrigatórios. Volte ao formulário.');
}

// A coluna ano_publicacao é do tipo DATE (formato AAAA-MM-DD, que é o que o input type="date" envia).
$data = DateTime::createFromFormat('Y-m-d', $anoPublicacao);
if (!$data || $data->format('Y-m-d') !== $anoPublicacao) {
    http_response_code(400);
    exit('Data de publicação inválida. Volte ao formulário.');
}

// A coluna quantidade é INT UNSIGNED; o formulário exige pelo menos 1 exemplar.
if ($quantidade === false || $quantidade < 1) {
    http_response_code(400);
    exit('Informe uma quantidade de exemplares válida (mínimo 1). Volte ao formulário.');
}

// Tamanhos máximos definidos no banco.
if (mb_strlen($titulo) > 100 || mb_strlen($autor) > 100
    || mb_strlen($genero) > 50 || ($isbn !== null && mb_strlen($isbn) > 30)) {
    http_response_code(400);
    exit('Algum campo ultrapassou o tamanho máximo. Volte ao formulário.');
}

require __DIR__ . '/conexao.php';

try {
    // Transação: grava o livro e o registro no histórico juntos, ou não grava nada.
    $conexao->begin_transaction();

    // Os ? são espaços reservados para os dados, separados do comando SQL.
    $sql = 'INSERT INTO livros (titulo, autor, ano_publicacao, genero, isbn, quantidade)
            VALUES (?, ?, ?, ?, ?, ?)';
    $comando = $conexao->prepare($sql);
    $comando->bind_param('sssssi', $titulo, $autor, $anoPublicacao, $genero, $isbn, $quantidade);
    $comando->execute();
    $livroId = $conexao->insert_id;
    $comando->close();

    // Registra o cadastro na tabela historico (quantidade anterior = 0).
    $sqlHistorico = "INSERT INTO historico (livro_id, tipo, quantidade, quantidade_anterior, quantidade_atual)
                     VALUES (?, 'cadastro', ?, 0, ?)";
    $comandoHistorico = $conexao->prepare($sqlHistorico);
    $comandoHistorico->bind_param('iii', $livroId, $quantidade, $quantidade);
    $comandoHistorico->execute();
    $comandoHistorico->close();

    $conexao->commit();
    $conexao->close();
} catch (mysqli_sql_exception $erro) {
    $conexao->rollback();
    error_log($erro->getMessage());
    http_response_code(500);
    exit('Não foi possível salvar o livro. Confira a tabela livros e o log de erros do Apache.');
}

// O redirecionamento evita repetir o INSERT ao atualizar a página.
header('Location: consulta.html', true, 303);
exit;