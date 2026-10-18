const STORAGE_KEY = "bibliotecaKojiLivros";

const bookForm = document.getElementById("bookForm");
const bookTableBody = document.getElementById("bookTableBody");
const formMessage = document.getElementById("formMessage");
const searchInput = document.getElementById("searchInput");
const searchForm = document.getElementById("searchForm");

let books = loadBooks();
let currentSearch = "";

function loadBooks() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    return saved ? JSON.parse(saved) : [];
  } catch {
    return [];
  }
}

function saveBooks() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(books));
}

function escapeHTML(value) {
  return String(value).replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#039;"
  })[character]);
}

function renderBooks() {
  const filteredBooks = books.filter(book => {
    const text = `${book.title} ${book.author} ${book.isbn} ${book.category}`.toLowerCase();
    return text.includes(currentSearch.toLowerCase());
  });

  document.getElementById("totalBooks").textContent = books.length;
  document.getElementById("totalCopies").textContent =
    books.reduce((total, book) => total + Number(book.quantity), 0);
  document.getElementById("totalCategories").textContent =
    new Set(books.map(book => book.category)).size;
  document.getElementById("catalogCount").textContent =
    `${filteredBooks.length} ${filteredBooks.length === 1 ? "livro" : "livros"}`;

  if (filteredBooks.length === 0) {
    const message = currentSearch
      ? "Nenhum livro encontrado para essa busca."
      : "Nenhum livro cadastrado ainda. Use o formulário acima para adicionar o primeiro!";
    bookTableBody.innerHTML = `<tr class="empty-row"><td colspan="6">${message}</td></tr>`;
    return;
  }

  bookTableBody.innerHTML = filteredBooks.map(book => `
    <tr>
      <td>${escapeHTML(book.title)}</td>
      <td>${escapeHTML(book.author)}</td>
      <td><span class="category-tag">${escapeHTML(book.category)}</span></td>
      <td>${escapeHTML(book.isbn || "—")}</td>
      <td>${escapeHTML(book.year || "—")}</td>
      <td>${Number(book.quantity)}</td>
      <td><button class="delete-button" type="button" data-delete="${book.id}">Excluir</button></td>
    </tr>
  `).join("");
}

bookForm.addEventListener("submit", event => {
  event.preventDefault();

  const formData = new FormData(bookForm);
  const book = {
    id: (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Date.now()),
    title: formData.get("title").trim(),
    author: formData.get("author").trim(),
    isbn: formData.get("isbn").trim(),
    category: formData.get("category"),
    year: formData.get("year"),
    quantity: Number(formData.get("quantity"))
  };

  if (!book.title || !book.author || !book.category || book.quantity < 1) {
    formMessage.style.color = "#b21c3a";
    formMessage.textContent = "Confira os campos obrigatórios antes de continuar.";
    return;
  }

  books.unshift(book);
  saveBooks();
  renderBooks();
  bookForm.reset();
  document.getElementById("quantity").value = 1;
  formMessage.style.color = "#177245";
  formMessage.textContent = "Livro cadastrado com sucesso!";
});

bookTableBody.addEventListener("click", event => {
  const button = event.target.closest("[data-delete]");
  if (!button) return;

  const book = books.find(item => item.id === button.dataset.delete);
  if (!book) return;
  if (!confirm(`Deseja excluir "${book.title}" do catálogo?`)) return;

  books = books.filter(item => item.id !== button.dataset.delete);
  saveBooks();
  renderBooks();
  formMessage.style.color = "#177245";
  formMessage.textContent = "Livro removido do catálogo.";
});

searchInput.addEventListener("input", () => {
  currentSearch = searchInput.value.trim();
  renderBooks();
});

searchForm.addEventListener("submit", event => {
  event.preventDefault();
  currentSearch = searchInput.value.trim();
  renderBooks();
  document.getElementById("catalogo").scrollIntoView({ behavior: "smooth" });
});

bookForm.addEventListener("reset", () => {
  formMessage.textContent = "";
});

renderBooks();
