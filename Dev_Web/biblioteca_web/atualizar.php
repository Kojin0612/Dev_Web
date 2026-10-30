<?php
header('Content-Type: text/html; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    header('Allow: POST');
    exit('Use o formulário de edição para atualizar um aluno.');
}

$id = filter_input(INPUT_POST, 'id', FILTER_VALIDATE_INT);
$nome = $_POST['nome'] ?? '';
$email = $_POST['email'] ?? '';
$curso = $_POST['curso'] ?? '';

if (!$id || $id < 1) {
    http_response_code(400);
    exit('ID inválido. Volte à listagem.');
}

if (!is_string($nome) || !is_string($email) || !is_string($curso)
    || trim($nome) === '' || trim($email) === '' || trim($curso) === '') {
    http_response_code(400);
    exit('Preencha todos os campos. Volte ao formulário de edição.');
}

if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    http_response_code(400);
    exit('Informe um e-mail válido. Volte ao formulário de edição.');
}

require __DIR__ . '/conexao.php';

try {
    $sql = 'UPDATE alunos SET nome = ?, email = ?, curso = ? WHERE id = ?';
    $comando = $conexao->prepare($sql);
    $comando->bind_param('sssi', $nome, $email, $curso, $id);
    $comando->execute();
    $comando->close();
    $conexao->close();
} catch (mysqli_sql_exception $erro) {
    error_log($erro->getMessage());
    http_response_code(500);
    exit('Não foi possível atualizar o aluno. Consulte o log de erros do Apache.');
}

header('Location: listar.php', true, 303);
exit;