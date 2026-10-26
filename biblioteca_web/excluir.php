<?php
header('Content-Type: text/html; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit('Use o botão Excluir na listagem.');
}

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
if (!$id || $id < 1) {
    http_response_code(400);
    exit('ID inválido. Volte à listagem.');
}

require __DIR__ . '/conexao.php';

try {
    $comando = $conexao->prepare('DELETE FROM alunos WHERE id = ?');
    $comando->bind_param('i', $id);
    $comando->execute();
    $comando->close();
    $conexao->close();
} catch (mysqli_sql_exception $erro) {
    error_log($erro->getMessage());
    http_response_code(500);
    exit('Não foi possível excluir o aluno. Consulte o log de erros do Apache.');
}

header('Location: listar.php', true, 303);
exit;