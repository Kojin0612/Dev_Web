// Biblioteca Koji — script.js
//
// Conversa com o PHP (listar.php, salvar.php, excluir.php) por fetch; o PHP lê e
// grava os livros no MySQL. O mesmo arquivo serve para index.html, consulta.html
// e cadastro.html: cada trecho só roda se os elementos dele existirem na página.
//
// Ganchos que este script procura no HTML (se mudar um id lá, mude aqui também):
//   #bookForm  #formMessage          → formulário de cadastro (cadastro.html)
//   #bookTableBody  thead th         → tabela de livros (index.html e consulta.html)
//   th[data-sort="coluna"]           → cabeçalhos clicáveis que ordenam a tabela
//   #searchForm  #searchInput        → pesquisa do topo
//   #clearSearch                     → botão ✕ que limpa a pesquisa
//   #catalogo  #catalogCount         → seção do catálogo e contador de resultados
//   #totalBooks #totalCopies #totalCategories → cartões de estatística

// ---------- Elementos da página (getElementById) ----------
const bookForm      = document.getElementById("bookForm");
const formMessage   = document.getElementById("formMessage");
const bookTableBody = document.getElementById("bookTableBody");
const searchForm    = document.getElementById("searchForm");
const searchInput   = document.getElementById("searchInput");
const clearSearch   = document.getElementById("clearSearch");

// Colunas da tabela: index = 6, consulta = 7, cadastro = 0 (querySelectorAll).
const columnCount = document.querySelectorAll("thead th").length;

// ---------- Estado ----------
let books = [];        // livros vindos do banco
let loadError = false; // true quando o listar.php falhou
let sortKey = "";      // coluna usada na ordenação ("" = ordem que veio do banco)
let sortDir = 1;       // 1 = crescente, -1 = decrescente

// ---------- Funções auxiliares ----------
function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function setText(id, value) {
  const element = document.getElementById(id);
  if (element) element.textContent = value;
}

// plural(1, "livro", "livros") → "1 livro"   |   plural(3, ...) → "3 livros"
function plural(count, singular, pluralForm) {
  return `${count} ${count === 1 ? singular : pluralForm}`;
}

// O banco devolve a data como AAAA-MM-DD; aqui ela vira DD/MM/AAAA.
function formatDate(value) {
  if (!value) return "—";
  const [year, month, day] = String(value).split("-");
  return year && month && day ? `${day}/${month}/${year}` : String(value);
}

function showFormMessage(text, isError = false) {
  if (!formMessage) return;
  formMessage.style.color = isError ? "#b21c3a" : "#177245";
  formMessage.textContent = text;
}

// ---------- Pesquisa: filtrar e ordenar ----------
// Texto da busca sem espaços nas pontas (trim) e em minúsculas (toLowerCase).
function getSearchTerm() {
  return searchInput ? searchInput.value.trim().toLowerCase() : "";
}

// Comparador de texto criado UMA vez só: reaproveitá-lo é ~20x mais rápido que chamar
// localeCompare(..., opções) a cada comparação (com 5.000 livros: 9 ms contra 221 ms).
// numeric: "10" vem depois de "2"; datas AAAA-MM-DD e acentos (pt-BR) ordenam certo.
const collator = new Intl.Collator("pt-BR", { numeric: true });

// Devolve os livros que aparecem na tabela, já filtrados e ordenados.
// O filter cria uma lista nova, então "books" nunca é alterada.
function getVisibleBooks(term) {
  const result = books.filter(book => {
    const text = `${book.titulo} ${book.autor} ${book.isbn || ""} ${book.genero}`.toLowerCase();
    return text.includes(term); // includes: o texto do livro contém o que foi digitado?
  });

  if (sortKey) {
    result.sort((a, b) => sortDir * collator.compare(a[sortKey] ?? "", b[sortKey] ?? ""));
  }
  return result;
}

// ---------- Desenho da tela ----------
function emptyRow(message) {
  return `<tr class="empty-row"><td colspan="${columnCount}">${message}</td></tr>`;
}

function bookRow(book) {
  // A coluna "Ano de Publicação" só existe na consulta.html (7 colunas).
  const yearCell = columnCount === 7 ? `<td>${escapeHTML(formatDate(book.ano_publicacao))}</td>` : "";

  return `
    <tr>
      <td>${escapeHTML(book.titulo)}</td>
      <td>${escapeHTML(book.autor)}</td>
      ${yearCell}
      <td><span class="category-tag">${escapeHTML(book.genero)}</span></td>
      <td>${escapeHTML(book.isbn || "—")}</td>
      <td>${Number(book.quantidade)}</td>
      <td class="actions-cell">
        <a class="edit-button" href="editar.php?id=${encodeURIComponent(book.id)}">Editar</a>
        <button class="delete-button" type="button" data-delete="${escapeHTML(book.id)}">Excluir</button>
      </td>
    </tr>`;
}

function tableHTML(visibleBooks, term) {
  if (loadError) {
    return emptyRow("Não foi possível carregar os livros. Confira se o Apache e o MySQL estão ligados no XAMPP e abra o site por http://localhost/.");
  }
  if (visibleBooks.length === 0) {
    return emptyRow(term
      ? "Nenhum livro encontrado para essa busca."
      : 'Nenhum livro cadastrado ainda. Use a página "Cadastrar livro" para adicionar o primeiro!');
  }
  return visibleBooks.map(bookRow).join("");
}

function renderBooks() {
  const term = getSearchTerm();
  const visibleBooks = getVisibleBooks(term);

  // Estatísticas (existem no index e no cadastro).
  setText("totalBooks", books.length);
  setText("totalCopies", books.reduce((total, book) => total + Number(book.quantidade), 0));
  setText("totalCategories", new Set(books.map(book => book.genero)).size);

  // Contador de resultados: "3 resultados" durante a pesquisa, "12 livros" sem pesquisa.
  setText("catalogCount", term
    ? plural(visibleBooks.length, "resultado", "resultados")
    : plural(visibleBooks.length, "livro", "livros"));

  // O botão ✕ só aparece quando há texto na pesquisa.
  if (clearSearch) clearSearch.hidden = term === "";

  // A página de cadastro não tem tabela.
  if (bookTableBody) bookTableBody.innerHTML = tableHTML(visibleBooks, term);
}

// ---------- Comunicação com o PHP ----------
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

// ---------- Validação visual dos campos ----------
// Pinta o campo de vermelho (.invalid) ou de verde (.valid). As regras vêm do próprio
// HTML (required, min, type="date"...) por checkValidity(); o trim() barra campo só com espaços.
function validateField(field) {
  const value = field.value.trim();
  const isValid = field.checkValidity() && !(field.required && value === "");

  field.classList.toggle("invalid", !isValid);
  field.classList.toggle("valid", isValid && value !== ""); // campo opcional vazio fica neutro
  field.setAttribute("aria-invalid", String(!isValid));
  return isValid;
}

// ---------- Cadastro (cadastro.html) ----------
if (bookForm) {
  bookForm.noValidate = true; // sem os balões do navegador: quem avisa agora é o validateField()

  // id do campo no HTML → nome que o salvar.php espera (colunas do banco).
  const serverNames = {
    title: "titulo", author: "autor", year: "ano_publicacao",
    category: "genero", isbn: "isbn", quantity: "quantidade"
  };
  const fields = [...bookForm.querySelectorAll("input, select")];

  // Valida cada campo enquanto a pessoa digita e quando ela sai dele.
  fields.forEach(field => {
    field.addEventListener("input", () => validateField(field));
    field.addEventListener("blur", () => validateField(field));
  });

  bookForm.addEventListener("submit", async event => {
    event.preventDefault(); // não deixa o navegador recarregar a página

    // filter (e não every) para marcar TODOS os campos errados de uma vez.
    const invalidFields = fields.filter(field => !validateField(field));
    if (invalidFields.length > 0) {
      showFormMessage("Confira os campos destacados em vermelho.", true);
      invalidFields[0].focus();
      return;
    }

    const data = new FormData();
    fields.forEach(field => data.append(serverNames[field.id], field.value.trim()));

    const submitButton = bookForm.querySelector('button[type="submit"]');
    if (submitButton) submitButton.disabled = true;

    try {
      const response = await fetch("salvar.php", { method: "POST", body: data });
      if (!response.ok) {
        const text = (await response.text()).trim();
        showFormMessage(text || "Não foi possível salvar o livro.", true);
        return;
      }

      bookForm.reset(); // o "reset" abaixo limpa as cores e a mensagem
      showFormMessage("Livro cadastrado com sucesso!", false);
      await loadBooks(); // atualiza as estatísticas
    } catch (error) {
      console.error("Erro ao salvar livro:", error);
      showFormMessage("Não foi possível conectar ao servidor. Confira o Apache e abra o site por http://localhost/.", true);
    } finally {
      if (submitButton) submitButton.disabled = false;
    }
  });

  // Botão "Limpar": tira a mensagem e as cores de válido/inválido.
  bookForm.addEventListener("reset", () => {
    if (formMessage) formMessage.textContent = "";
    fields.forEach(field => {
      field.classList.remove("valid", "invalid");
      field.removeAttribute("aria-invalid");
    });
  });
}

// ---------- Tabela: excluir e ordenar ----------
if (bookTableBody) {
  // Um único ouvinte na tabela inteira atende todos os botões "Excluir".
  bookTableBody.addEventListener("click", async event => {
    const button = event.target.closest("[data-delete]");
    if (!button) return;

    const book = books.find(item => String(item.id) === button.dataset.delete);
    if (!book || !confirm(`Deseja excluir "${book.titulo}" do catálogo?`)) return;

    try {
      const data = new FormData();
      data.append("id", book.id);
      const response = await fetch("excluir.php", { method: "POST", body: data });
      if (!response.ok) throw new Error(await response.text());
      await loadBooks();
    } catch (error) {
      console.error("Erro ao excluir livro:", error);
      alert("Não foi possível excluir o livro. Confira o Apache e o MySQL.");
    }
  });
}

// Cada <th data-sort="coluna_do_banco"> ordena a tabela; clicar de novo inverte a ordem.
const sortHeaders = document.querySelectorAll("th[data-sort]");

sortHeaders.forEach(header => {
  header.addEventListener("click", () => {
    sortDir = sortKey === header.dataset.sort ? -sortDir : 1;
    sortKey = header.dataset.sort;

    // aria-sort mostra a setinha (CSS) e avisa leitores de tela qual coluna está ordenada.
    sortHeaders.forEach(item => {
      const direction = sortDir === 1 ? "ascending" : "descending";
      item.setAttribute("aria-sort", item === header ? direction : "none");
    });
    renderBooks();
  });
});

// ---------- Pesquisa: digitar, buscar e limpar ----------
if (searchInput) {
  searchInput.addEventListener("input", renderBooks); // filtra enquanto digita
}

if (searchForm) {
  searchForm.addEventListener("submit", event => {
    event.preventDefault(); // Enter / lupa não recarregam a página
    renderBooks();
    const catalog = document.getElementById("catalogo");
    if (catalog) catalog.scrollIntoView({ behavior: "smooth" }); // rola até o catálogo
  });
}

if (clearSearch) {
  clearSearch.addEventListener("click", () => {
    searchInput.value = "";
    renderBooks();
    searchInput.focus();
  });
}

loadBooks();