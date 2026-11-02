<?php
header('Content-Type: text/html; charset=utf-8');

$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id || $id < 1) {
    http_response_code(400);
    exit('ID inválido. Volte à listagem.');
}

require __DIR__ . '/conexao.php';

$comando = $conexao->prepare('SELECT id, nome, email, curso FROM alunos WHERE id = ?');
$comando->bind_param('i', $id);
$comando->execute();
$aluno = $comando->get_result()->fetch_assoc();
$comando->close();
$conexao->close();

if (!$aluno) {
    http_response_code(404);
    exit('Aluno não encontrado. Volte à listagem.');
}
?>
<!DOCTYPE html>
<html lang="pt-BR">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>Editar aluno</title>
</head>
<body>
    <h1>Editar aluno</h1>
    <form action="atualizar.php" method="post">
        <input type="hidden" name="id" value="<?= (int) $aluno['id'] ?>">

        <p>
            <label for="nome">Nome completo</label>
            <input type="text" id="nome" name="nome" maxlength="100" required
                   value="<?= htmlspecialchars($aluno['nome'], ENT_QUOTES, 'UTF-8') ?>">
        </p>
        <p>
            <label for="email">E-mail</label>
            <input type="email" id="email" name="email" maxlength="150" required
                   value="<?= htmlspecialchars($aluno['email'], ENT_QUOTES, 'UTF-8') ?>">
        </p>
        <p>
            <label for="curso">Curso</label>
            <input type="text" id="curso" name="curso" maxlength="100" required
                   value="<?= htmlspecialchars($aluno['curso'], ENT_QUOTES, 'UTF-8') ?>">
        </p>
        <button type="submit">Salvar alterações</button>
    </form>
    <p><a href="listar.php">Cancelar e voltar à listagem</a></p>
</body>
</html>