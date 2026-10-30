<?php
// Devolve todos os livros em formato JSON para o script.js montar a tabela.
header('Content-Type: application/json; charset=utf-8');

require __DIR__ . '/conexao.php';

try {
    // Lista primeiro os cadastros mais recentes.
    $sql = 'SELECT id, titulo, autor, ano_publicacao, genero, isbn, quantidade
            FROM livros ORDER BY id DESC';
    $resultado = $conexao->query($sql);
    $livros = $resultado->fetch_all(MYSQLI_ASSOC);
    $conexao->close();
} catch (mysqli_sql_exception $erro) {
    error_log($erro->getMessage());
    http_response_code(500);
    exit('Não foi possível listar os livros. Consulte o log de erros do Apache.');
}

echo json_encode($livros, JSON_UNESCAPED_UNICODE);