<?php
// Configuração para o XAMPP local. Ajuste se tiver definido outra senha ou porta.
$servidor = '127.0.0.1';
$usuario = 'root';
$senha = '';
$banco = 'biblioteca';
$porta = 3306;

mysqli_report(MYSQLI_REPORT_ERROR | MYSQLI_REPORT_STRICT);

try {
    $conexao = new mysqli($servidor, $usuario, $senha, $banco, $porta);
    $conexao->set_charset('utf8mb4');
} catch (mysqli_sql_exception $erro) {
    error_log($erro->getMessage());
    http_response_code(500);
    exit('Falha na conexão. Confira o MySQL, o banco biblioteca e os dados de conexao.php.');
}