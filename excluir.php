<?php
header('Content-Type: text/html; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit('Use o botão Excluir no catálogo.');
}

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
if (!$id || $id < 1) {
    http_response_code(400);
    exit('ID inválido.');
}

require __DIR__ . '/conexao.php';

try {
    $comando = $conexao->prepare('DELETE FROM livros WHERE id = ?');
    $comando->bind_param('i', $id);
    $comando->execute();
    $comando->close();
    $conexao->close();
} catch (mysqli_sql_exception $erro) {
    error_log($erro->getMessage());
    http_response_code(500);
    exit('Não foi possível excluir o livro. Consulte o log de erros do Apache.');
}

// O script.js só precisa saber que deu certo (status 200).
echo 'ok';