<?php
header('Content-Type: text/html; charset=utf-8');

// Recebe o id do livro pela URL: editar.php?id=3
$id = filter_input(INPUT_GET, 'id', FILTER_VALIDATE_INT);
if (!$id || $id < 1) {
    http_response_code(400);
    exit('ID inválido. Volte ao catálogo.');
}

require __DIR__ . '/conexao.php';

try {
    $comando = $conexao->prepare(
        'SELECT id, titulo, autor, ano_publicacao, genero, isbn, quantidade FROM livros WHERE id = ?'
    );
    $comando->bind_param('i', $id);
    $comando->execute();
    $livro = $comando->get_result()->fetch_assoc();
    $comando->close();
    $conexao->close();
} catch (mysqli_sql_exception $erro) {
    error_log($erro->getMessage());
    http_response_code(500);
    exit('Não foi possível buscar o livro. Consulte o log de erros do Apache.');
}

if (!$livro) {
    http_response_code(404);
    exit('Livro não encontrado. Volte ao catálogo.');
}

// Escapa o texto antes de colocar dentro do HTML (evita quebrar a página com aspas e símbolos).
function h($valor)
{
    return htmlspecialchars((string) $valor, ENT_QUOTES, 'UTF-8');
}

// Mesmos gêneros do cadastro.html. Se o livro tiver um gênero fora da lista, ele é acrescentado.
$generos = ['Literatura', 'Fantasia', 'Ficção científica', 'Romance', 'História', 'Educação', 'Tecnologia', 'Infantil', 'Outros'];
if (!in_array($livro['genero'], $generos, true)) {
    $generos[] = $livro['genero'];
}
?>
<!DOCTYPE html>
<html lang="pt-br">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Editar livro - Koji</title>
  <link rel="stylesheet" href="estilo.css">
</head>
<body>

  <header class="topbar" id="inicio">
    <a class="brand" href="index.html" aria-label="Biblioteca Koji">
      <span class="brand-icon">📙</span>
      <span>Koji</span>
    </a>

    <form class="search" id="searchForm" onsubmit="return false;">
      <label class="sr-only" for="searchInput">Buscar livros</label>
      <select aria-label="Tipo de busca">
        <option>Livros</option>
        <option>Autores</option>
        <option>Categorias</option>
      </select>
      <span class="search-icon">⌕</span>
      <input id="searchInput" type="search" placeholder="Buscar na biblioteca">
      <button type="submit" aria-label="Buscar">⌕</button>
    </form>

    <nav class="top-actions" aria-label="Atalhos">
      <a href="consulta.html" title="Catálogo">☺</a>
    </nav>
  </header>

  <nav class="main-nav" aria-label="Navegação principal">
    <a href="index.html">INÍCIO</a>
    <a href="consulta.html">CATÁLOGO</a>
    <a href="cadastro.html">CADASTRAR LIVRO</a>
  </nav>

  <main>

    <section class="content-grid">
      <section class="panel form-panel" id="edicao">
        <div class="section-heading">
          <div>
            <span class="section-kicker">GERENCIAMENTO</span>
            <h2>Editar livro</h2>
          </div>
          <span class="heading-icon">✎</span>
        </div>
        <p class="muted">Altere os dados abaixo e salve para atualizar o livro no acervo.</p>

        <form id="editForm" action="atualizar.php" method="post">
          <input type="hidden" name="id" value="<?= (int) $livro['id'] ?>">

          <div class="form-row">
            <div class="field field-wide">
              <label for="title">Título do livro *</label>
              <input id="title" name="titulo" type="text" maxlength="100" required
                     value="<?= h($livro['titulo']) ?>">
            </div>
            <div class="field">
              <label for="author">Autor(a) *</label>
              <input id="author" name="autor" type="text" maxlength="100" required
                     value="<?= h($livro['autor']) ?>">
            </div>
            <div class="field">
              <label for="year">Ano de Publicação *</label>
              <input id="year" name="ano_publicacao" type="date" required
                     value="<?= h($livro['ano_publicacao']) ?>">
            </div>
          </div>
          <div class="form-row">
            <div class="field">
              <label for="isbn">ISBN</label>
              <input id="isbn" name="isbn" type="text" maxlength="30"
                     value="<?= h($livro['isbn']) ?>">
            </div>
            <div class="field">
              <label for="category">Gênero *</label>
              <select id="category" name="genero" required>
                <?php foreach ($generos as $genero): ?>
                  <option<?= $genero === $livro['genero'] ? ' selected' : '' ?>><?= h($genero) ?></option>
                <?php endforeach; ?>
              </select>
            </div>
            <div class="field field-small">
              <label for="quantity">Exemplares *</label>
              <input id="quantity" name="quantidade" type="number" min="1" required
                     value="<?= (int) $livro['quantidade'] ?>">
            </div>
          </div>
          <div class="form-actions">
            <a class="button button-secondary" href="consulta.html">Cancelar</a>
            <button class="button button-primary" type="submit">Salvar alterações</button>
          </div>
        </form>
      </section>
    </section>
  </main>

<footer>
    <a class="footer-brand" href="#inicio">▱ Koji</a>
    <p>Biblioteca Koji · Sistema de cadastro de livros</p>
    <a href="#inicio">Voltar ao topo ↑</a>
  </footer>

</body>
</html>