// Este script conversa com o PHP (salvar.php, listar.php, excluir.php),
// que por sua vez grava e lê os livros no MySQL (banco "biblioteca").
// Os livros NÃO ficam mais no localStorage do navegador.

const bookForm = document.getElementById("bookForm");
const bookTableBody = document.getElementById("bookTableBody");
const formMessage = document.getElementById("formMessage");
const searchInput = document.getElementById("searchInput");
const searchForm = document.getElementById("searchForm");

// Quantas colunas a tabela da página tem (index = 6, consulta = 7, cadastro = 0).
const columnCount = document.querySelectorAll("thead th").length;

let books = [];
let currentSearch = "";
let loadError = false;

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

function fieldValue(id) {
  const element = document.getElementById(id);
  return element ? element.value.trim() : "";
}

// O banco devolve a data como AAAA-MM-DD; aqui ela vira DD/MM/AAAA.
function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = String(value).split("-");
  return year && month && day ? `${day}/${month}/${year}` : String(value);
}

function showFormMessage(text, isError) {
  if (!formMessage) return;
  formMessage.style.color = isError ? "#b21c3a" : "#177245";
  formMessage.textContent = text;
}

function renderBooks() {
  const filteredBooks = books.filter(book => {
    const text = `${book.titulo} ${book.autor} ${book.isbn || ""} ${book.genero}`.toLowerCase();
    return text.includes(currentSearch.toLowerCase());
  });

  // Estatísticas (existem no index e no cadastro).
  setText("totalBooks", books.length);
  setText("totalCopies", books.reduce((total, book) => total + Number(book.quantidade), 0));
  setText("totalCategories", new Set(books.map(book => book.genero)).size);
  setText("catalogCount",
    `${filteredBooks.length} ${filteredBooks.length === 1 ? "livro" : "livros"}`);

  // A página de cadastro não tem tabela.
  if (!bookTableBody) return;

  if (loadError) {
    bookTableBody.innerHTML = `<tr class="empty-row"><td colspan="${columnCount}">Não foi possível carregar os livros. Confira se o Apache e o MySQL estão ligados no XAMPP e abra o site por http://localhost/.</td></tr>`;
    return;
  }

  if (filteredBooks.length === 0) {
    const message = currentSearch
      ? "Nenhum livro encontrado para essa busca."
      : bookForm
        ? "Nenhum livro cadastrado ainda. Use o formulário acima para adicionar o primeiro!"
        : 'Nenhum livro cadastrado ainda. Use a página "Cadastrar livro" para adicionar o primeiro!';
    bookTableBody.innerHTML = `<tr class="empty-row"><td colspan="${columnCount}">${message}</td></tr>`;
    return;
  }

  // consulta.html tem 7 colunas (com Ano de Publicação); index.html tem 6.
  const showYear = columnCount === 7;

  bookTableBody.innerHTML = filteredBooks.map(book => `
    <tr>
      <td>${escapeHTML(book.titulo)}</td>
      <td>${escapeHTML(book.autor)}</td>
      ${showYear ? `<td>${escapeHTML(formatDate(book.ano_publicacao))}</td>` : ""}
      <td><span class="category-tag">${escapeHTML(book.genero)}</span></td>
      <td>${escapeHTML(book.isbn || "—")}</td>
      <td>${Number(book.quantidade)}</td>
      <td><button class="delete-button" type="button" data-delete="${escapeHTML(book.id)}">Excluir</button></td>
    </tr>
  `).join("");
}

// Busca os livros no banco (listar.php devolve JSON).
async function loadBooks() {
  try {
    const response = await fetch("listar.php", { headers: { Accept: "application/json" } });
    if (!response.ok) throw new Error(await response.text());
    books = await response.json();
    loadError = false;
  } catch (error) {
    console.error("Erro ao carregar livros:", error);
    books = [];
    loadError = true;
  }
  renderBooks();
}

if (bookForm) {
  bookForm.addEventListener("submit", async event => {
    event.preventDefault();

    // Os nomes à esquerda são os nomes das colunas do banco / campos do salvar.php.
    const data = new FormData();
    data.append("titulo", fieldValue("title"));
    data.append("autor", fieldValue("author"));
    data.append("ano_publicacao", fieldValue("year"));
    data.append("genero", fieldValue("category"));
    data.append("isbn", fieldValue("isbn"));
    data.append("quantidade", fieldValue("quantity"));

    if (!data.get("titulo") || !data.get("autor") || !data.get("ano_publicacao")
        || !data.get("genero") || Number(data.get("quantidade")) < 1) {
      showFormMessage("Confira os campos obrigatórios antes de continuar.", true);
      return;
    }

    const submitButton = bookForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch("salvar.php", { method: "POST", body: data });
      if (!response.ok) {
        const text = (await response.text()).trim();
        showFormMessage(text || "Não foi possível salvar o livro.", true);
        return;
      }

      bookForm.reset();
      document.getElementById("quantity").value = 1;
      showFormMessage("Livro cadastrado com sucesso!", false);
      await loadBooks();
    } catch (error) {
      console.error("Erro ao salvar livro:", error);
      showFormMessage("Não foi possível conectar ao servidor. Confira o Apache e abra o site por http://localhost/.", true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  bookForm.addEventListener("reset", () => {
    if (formMessage) formMessage.textContent = "";
  });
}

if (bookTableBody) {
  bookTableBody.addEventListener("click", async event => {
    const button = event.target.closest("[data-delete]");
    if (!button) return;

    const book = books.find(item => String(item.id) === button.dataset.delete);
    if (!book) return;
    if (!confirm(`Deseja excluir "${book.titulo}" do catálogo?`)) return;

    try {
      const data = new FormData();
      data.append("id", book.id);
      const response = await fetch("excluir.php", { method: "POST", body: data });
      if (!response.ok) throw new Error(await response.text());

      showFormMessage("Livro removido do catálogo.", false);
      await loadBooks();
    } catch (error) {
      console.error("Erro ao excluir livro:", error);
      showFormMessage("Não foi possível excluir o livro.", true);
      alert("Não foi possível excluir o livro. Confira o Apache e o MySQL.");
    }
  });
}

if (searchInput) {
  searchInput.addEventListener("input", () => {
    currentSearch = searchInput.value.trim();
    renderBooks();
  });
}

if (searchForm) {
  searchForm.addEventListener("submit", event => {
    event.preventDefault();
    currentSearch = searchInput.value.trim();
    renderBooks();
    const catalog = document.getElementById("catalogo");
    if (catalog) catalog.scrollIntoView({ behavior: "smooth" });
  });
}

loadBooks();