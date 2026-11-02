create database biblioteca 
	CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
use biblioteca;

create TABLE livros (id int unsigned AUTO_INCREMENT PRIMARY KEY, titulo varchar(100) not null, autor varchar(100) not null, ano_publicacao date not null, genero varchar (50) not null, isbn varchar(30) null, quantidade int unsigned not null default 0);

CREATE TABLE historico (id bigint unsigned AUTO_INCREMENT PRIMARY KEY, livro_id int unsigned null, tipo ENUM('cadastro', 'entrada', 'saida', 'ajuste') NOT NULL, quantidade int unsigned not null DEFAULT 0, quantidade_anterior int unsigned not null DEFAULT 0, quantidade_atual int unsigned not null DEFAULT 0, data_movimentacao timestamp not null DEFAULT CURRENT_TIMESTAMP, CONSTRAINT fk_movimentos_livros FOREIGN KEY (livro_id) REFERENCES livros(id) on delete set null, INDEX idx_data_movimentacao (data_movimentacao));