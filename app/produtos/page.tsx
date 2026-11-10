"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Produto = {
  id: number;
  categoria_id: number;
  nome: string;
  descricao: string | null;
  tamanho: string | null;
  preco: number;
  destaque: boolean;
  ativo: boolean;
};

type Categoria = {
  id: number;
  nome: string;
};

type Ordenacao = "nome" | "menor-preco" | "maior-preco";

const ITENS_POR_PAGINA = 8;

export default function ProdutosPage() {
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [busca, setBusca] = useState("");
  const [categoriaSelecionada, setCategoriaSelecionada] = useState("todas");
  const [ordenacao, setOrdenacao] = useState<Ordenacao>("nome");
  const [carregando, setCarregando] = useState(true);
  const [produtoEmProcessamento, setProdutoEmProcessamento] =
    useState<number | null>(null);
  const [mensagem, setMensagem] = useState("");
  const [erro, setErro] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);

  const carregarDados = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const [resultadoProdutos, resultadoCategorias] = await Promise.all([
        supabase
          .from("produtos")
          .select(
            "id, categoria_id, nome, descricao, tamanho, preco, destaque, ativo"
          )
          .order("nome", { ascending: true }),
        supabase
          .from("categorias")
          .select("id, nome")
          .eq("ativa", true)
          .order("ordem", { ascending: true }),
      ]);

      if (resultadoProdutos.error) throw new Error(resultadoProdutos.error.message);
      if (resultadoCategorias.error) throw new Error(resultadoCategorias.error.message);

      setProdutos((resultadoProdutos.data ?? []) as Produto[]);
      setCategorias((resultadoCategorias.data ?? []) as Categoria[]);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os produtos."
      );
    } finally {
      setCarregando(false);
    }
  }, []);

  useEffect(() => {
    void carregarDados();
  }, [carregarDados]);

  const produtosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    const resultado = produtos.filter((produto) => {
      const correspondeBusca =
        produto.nome.toLocaleLowerCase("pt-BR").includes(termo) ||
        (produto.descricao ?? "").toLocaleLowerCase("pt-BR").includes(termo);

      const correspondeCategoria =
        categoriaSelecionada === "todas" ||
        produto.categoria_id === Number(categoriaSelecionada);

      return correspondeBusca && correspondeCategoria;
    });

    return resultado.sort((a, b) => {
      if (ordenacao === "menor-preco") return a.preco - b.preco;
      if (ordenacao === "maior-preco") return b.preco - a.preco;
      return a.nome.localeCompare(b.nome, "pt-BR");
    });
  }, [produtos, busca, categoriaSelecionada, ordenacao]);

  // Paginação
  const totalPaginas = Math.ceil(produtosFiltrados.length / ITENS_POR_PAGINA) || 1;
  const produtosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    return produtosFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [produtosFiltrados, paginaAtual]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, categoriaSelecionada, ordenacao]);

  const formatarPreco = (valorEmCentavos: number) =>
    (valorEmCentavos / 100).toLocaleString("pt-BR", {
      style: "currency",
      currency: "BRL",
    });

  const obterNomeCategoria = (categoriaId: number) =>
    categorias.find((categoria) => categoria.id === categoriaId)?.nome ??
    "Categoria indisponível";

  async function alterarSituacao(produto: Produto) {
    setProdutoEmProcessamento(produto.id);
    setMensagem("");
    setErro("");

    try {
      const novoStatus = !produto.ativo;
      const { data, error } = await supabase
        .from("produtos")
        .update({ ativo: novoStatus })
        .eq("id", produto.id)
        .select("id, ativo")
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("Nenhuma alteração foi realizada.");

      setProdutos((atuais) =>
        atuais.map((item) =>
          item.id === produto.id ? { ...item, ativo: novoStatus } : item
        )
      );

      setMensagem(
        novoStatus
          ? "Produto ativado com sucesso."
          : "Produto desativado com sucesso."
      );
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível alterar a situação do produto."
      );
    } finally {
      setProdutoEmProcessamento(null);
    }
  }

  async function excluirProduto(produto: Produto) {
    if (
      !window.confirm(
        `Deseja realmente excluir o produto "${produto.nome}"? Esta ação não poderá ser desfeita.`
      )
    ) {
      return;
    }

    setProdutoEmProcessamento(produto.id);
    setMensagem("");
    setErro("");

    try {
      const { data, error } = await supabase
        .from("produtos")
        .delete()
        .eq("id", produto.id)
        .select("id");

      if (error) {
        throw new Error(
          error.message.includes("foreign key")
            ? "Este produto está em pedidos existentes e não pode ser excluído. Você pode desativá-lo."
            : error.message
        );
      }

      if (!data || data.length === 0) {
        throw new Error("O produto não foi excluído.");
      }

      setProdutos((atuais) => atuais.filter((item) => item.id !== produto.id));
      setMensagem("Produto excluído com sucesso.");
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir o produto."
      );
    } finally {
      setProdutoEmProcessamento(null);
    }
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="mb-3 inline-block text-sm text-orange-400 transition hover:text-orange-300"
            >
              ← Voltar ao início
            </Link>

            <h1 className="text-3xl font-bold tracking-tight sm:text-4xl">
              Gerenciamento de produtos
            </h1>

            <p className="mt-2 text-slate-400">
              Cadastre, consulte e gerencie os itens do cardápio.
            </p>
          </div>

          <Link
            href="/produtos/novo"
            className="inline-flex items-center justify-center rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white transition hover:bg-orange-600"
          >
            + Novo produto
          </Link>
        </header>

        {mensagem && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-700 bg-emerald-950/60 p-4 text-emerald-300"
          >
            {mensagem}
          </div>
        )}

        {erro && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-800 bg-red-950/60 p-4 text-red-300"
          >
            <p className="font-semibold">Ocorreu um problema</p>
            <p className="mt-1 break-words text-sm">{erro}</p>
          </div>
        )}

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-3">
            <div>
              <label
                htmlFor="busca-produto"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Buscar produto
              </label>
              <input
                id="busca-produto"
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Digite o nome ou descrição..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label
                htmlFor="filtro-categoria"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Filtrar por categoria
              </label>
              <select
                id="filtro-categoria"
                value={categoriaSelecionada}
                onChange={(e) => setCategoriaSelecionada(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
              >
                <option value="todas">Todas as categorias</option>
                {categorias.map((categoria) => (
                  <option key={categoria.id} value={String(categoria.id)}>
                    {categoria.nome}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label
                htmlFor="ordenacao"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Ordenar por
              </label>
              <select
                id="ordenacao"
                value={ordenacao}
                onChange={(e) => setOrdenacao(e.target.value as Ordenacao)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
              >
                <option value="nome">Nome: A–Z</option>
                <option value="menor-preco">Menor preço</option>
                <option value="maior-preco">Maior preço</option>
              </select>
            </div>
          </div>

          {carregando ? (
            <div role="status" className="py-16 text-center text-slate-400">
              Carregando produtos...
            </div>
          ) : produtosPaginados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 px-4 py-12 text-center">
              <p className="text-lg font-semibold text-slate-200">
                Nenhum produto encontrado
              </p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto rounded-xl border border-slate-800">
                <table className="w-full min-w-[900px] border-collapse text-left">
                  <thead className="bg-slate-950 text-sm text-slate-400">
                    <tr className="border-b border-slate-800">
                      <th className="px-4 py-4 font-medium">Produto</th>
                      <th className="px-4 py-4 font-medium">Categoria</th>
                      <th className="px-4 py-4 font-medium">Tamanho</th>
                      <th className="px-4 py-4 font-medium">Preço</th>
                      <th className="px-4 py-4 font-medium">Situação</th>
                      <th className="px-4 py-4 font-medium">Destaque</th>
                      <th className="px-4 py-4 font-medium">Ações</th>
                    </tr>
                  </thead>

                  <tbody className="divide-y divide-slate-800">
                    {produtosPaginados.map((produto) => {
                      const ocupado = produtoEmProcessamento === produto.id;
                      return (
                        <tr
                          key={produto.id}
                          className="transition hover:bg-slate-800/40"
                        >
                          <td className="px-4 py-4">
                            <div className="font-medium text-white">
                              {produto.nome}
                            </div>
                            <div className="mt-1 max-w-xs truncate text-xs text-slate-400">
                              {produto.descricao || "Sem descrição"}
                            </div>
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-300">
                            {obterNomeCategoria(produto.categoria_id)}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-300">
                            {produto.tamanho || "Não informado"}
                          </td>
                          <td className="whitespace-nowrap px-4 py-4 font-semibold text-orange-400">
                            {formatarPreco(produto.preco)}
                          </td>
                          <td className="px-4 py-4">
                            <span
                              className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${
                                produto.ativo
                                  ? "bg-emerald-950 text-emerald-300"
                                  : "bg-red-950 text-red-300"
                              }`}
                            >
                              {produto.ativo ? "Ativo" : "Inativo"}
                            </span>
                          </td>
                          <td className="px-4 py-4 text-sm">
                            {produto.destaque ? (
                              <span className="text-orange-300">★ Sim</span>
                            ) : (
                              <span className="text-slate-500">Não</span>
                            )}
                          </td>
                          <td className="px-4 py-4">
                            <div className="flex flex-wrap gap-2">
                              <Link
                                href={`/produtos/${produto.id}`}
                                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-200 transition hover:border-sky-500 hover:text-sky-300"
                              >
                                Detalhes
                              </Link>
                              <Link
                                href={`/produtos/editar/${produto.id}`}
                                className="rounded-lg border border-orange-700 px-3 py-1.5 text-xs font-medium text-orange-300 transition hover:bg-orange-950/50"
                              >
                                Editar
                              </Link>
                              <button
                                type="button"
                                disabled={ocupado}
                                onClick={() => void alterarSituacao(produto)}
                                className="rounded-lg border border-slate-600 px-3 py-1.5 text-xs font-medium text-slate-300 transition hover:bg-slate-800 disabled:opacity-50"
                              >
                                {ocupado
                                  ? "Aguarde..."
                                  : produto.ativo
                                  ? "Desativar"
                                  : "Ativar"}
                              </button>
                              <button
                                type="button"
                                disabled={ocupado}
                                onClick={() => void excluirProduto(produto)}
                                className="rounded-lg border border-red-900 px-3 py-1.5 text-xs font-medium text-red-300 transition hover:bg-red-950/60 disabled:opacity-50"
                              >
                                Excluir
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Paginação */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4 text-sm text-slate-400">
                <span>
                  Exibindo {produtosPaginados.length} de {produtosFiltrados.length}{" "}
                  produtos (Página {paginaAtual} de {totalPaginas})
                </span>
                <div className="flex gap-2">
                  <button
                    disabled={paginaAtual <= 1}
                    onClick={() => setPaginaAtual((p) => p - 1)}
                    className="rounded-lg border border-slate-700 px-4 py-2 font-medium transition hover:bg-slate-800 disabled:opacity-40"
                  >
                    Anterior
                  </button>
                  <button
                    disabled={paginaAtual >= totalPaginas}
                    onClick={() => setPaginaAtual((p) => p + 1)}
                    className="rounded-lg border border-slate-700 px-4 py-2 font-medium transition hover:bg-slate-800 disabled:opacity-40"
                  >
                    Próxima
                  </button>
                </div>
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}