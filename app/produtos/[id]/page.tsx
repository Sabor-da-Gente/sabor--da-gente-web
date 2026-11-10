"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Produto = {
  id: number;
  categoria_id: number;
  nome: string;
  descricao: string | null;
  tamanho: string | null;
  imagem_url: string | null;
  preco: number;
  destaque: boolean;
  ativo: boolean;
  criado_em: string;
};

type Categoria = {
  id: number;
  nome: string;
};

const moeda = (centavos: number) =>
  (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

function DetalhesProduto() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [produto, setProduto] = useState<Produto | null>(null);
  const [categoria, setCategoria] = useState<Categoria | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState("");

  useEffect(() => {
    async function carregarProduto() {
      setCarregando(true);
      setErro("");

      const idNumerico = Number(id);

      if (!id || !Number.isInteger(idNumerico) || idNumerico <= 0) {
        setErro("O identificador do produto é inválido.");
        setCarregando(false);
        return;
      }

      try {
        const { data: produtoEncontrado, error: erroProduto } = await supabase
          .from("produtos")
          .select(
            "id, categoria_id, nome, descricao, tamanho, imagem_url, preco, destaque, ativo, criado_em"
          )
          .eq("id", idNumerico)
          .maybeSingle();

        if (erroProduto) throw erroProduto;

        if (!produtoEncontrado) {
          setErro("Produto não encontrado.");
          return;
        }

        setProduto(produtoEncontrado);

        const { data: categoriaEncontrada, error: erroCategoria } =
          await supabase
            .from("categorias")
            .select("id, nome")
            .eq("id", produtoEncontrado.categoria_id)
            .maybeSingle();

        if (erroCategoria) throw erroCategoria;

        setCategoria(categoriaEncontrada);
      } catch (erroDesconhecido) {
        setErro(
          erroDesconhecido instanceof Error
            ? erroDesconhecido.message
            : "Não foi possível carregar os detalhes do produto."
        );
      } finally {
        setCarregando(false);
      }
    }

    void carregarProduto();
  }, [id]);

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-white/10 bg-zinc-900">
        <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-4 px-6 py-5">
          <Link href="/" className="text-xl font-bold text-orange-400">
            🍕 Sabor da Gente
          </Link>
          <Link
            href="/produtos"
            className="rounded-lg px-4 py-2 text-sm text-zinc-300 hover:bg-white/10"
          >
            Voltar aos produtos
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-5xl px-6 py-10">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-orange-400">
          Cardápio
        </p>
        <h1 className="mb-8 text-3xl font-bold sm:text-4xl">
          Detalhes do produto
        </h1>

        {carregando && (
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-10 text-center text-zinc-400">
            Carregando detalhes do produto...
          </div>
        )}

        {!carregando && erro && (
          <div
            role="alert"
            className="rounded-2xl border border-red-500/30 bg-red-950/40 p-6 text-red-300"
          >
            <p className="font-semibold">Não foi possível abrir o produto.</p>
            <p className="mt-2 break-words text-sm">{erro}</p>
            <Link
              href="/produtos"
              className="mt-5 inline-block rounded-lg bg-orange-500 px-4 py-2 font-semibold text-white hover:bg-orange-400"
            >
              Voltar à listagem
            </Link>
          </div>
        )}

        {!carregando && !erro && produto && (
          <div className="overflow-hidden rounded-2xl border border-white/10 bg-zinc-900">
            {produto.imagem_url && (
              <div className="border-b border-white/10 bg-zinc-950">
                <img
                  src={produto.imagem_url}
                  alt={produto.nome}
                  className="max-h-96 w-full object-contain"
                />
              </div>
            )}

            <div className="p-6 sm:p-8">
              <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-sm text-zinc-400">
                    Produto #{produto.id}
                  </p>
                  <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                    {produto.nome}
                  </h2>
                  <p className="mt-2 text-sm text-zinc-400">
                    Categoria: {categoria?.nome ?? "Não informada"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <span
                    className={`rounded-full px-3 py-1 text-xs font-semibold ${
                      produto.ativo
                        ? "bg-emerald-500/15 text-emerald-300"
                        : "bg-zinc-700 text-zinc-300"
                    }`}
                  >
                    {produto.ativo ? "Ativo" : "Inativo"}
                  </span>
                  {produto.destaque && (
                    <span className="rounded-full bg-orange-500/15 px-3 py-1 text-xs font-semibold text-orange-300">
                      Destaque
                    </span>
                  )}
                </div>
              </div>

              <div className="mb-8 rounded-xl border border-orange-500/20 bg-orange-500/5 p-5">
                <p className="text-sm text-zinc-400">Preço</p>
                <p className="mt-1 text-3xl font-bold text-orange-300">
                  {moeda(produto.preco)}
                </p>
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-5">
                  <p className="text-sm text-zinc-400">Tamanho</p>
                  <p className="mt-2 font-semibold">
                    {produto.tamanho ?? "Não informado"}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-5">
                  <p className="text-sm text-zinc-400">Data de cadastro</p>
                  <p className="mt-2 font-semibold">
                    {new Date(produto.criado_em).toLocaleString("pt-BR")}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-5 sm:col-span-2">
                  <p className="text-sm text-zinc-400">Descrição</p>
                  <p className="mt-2 whitespace-pre-wrap">
                    {produto.descricao || "Nenhuma descrição cadastrada."}
                  </p>
                </div>

                <div className="rounded-xl border border-white/10 bg-zinc-950/60 p-5 sm:col-span-2">
                  <p className="text-sm text-zinc-400">Identificação</p>
                  <p className="mt-2 font-semibold">
                    ID: {produto.id}
                  </p>
                  <p className="mt-1 text-sm text-zinc-400">
                    Categoria ID: {produto.categoria_id}
                  </p>
                </div>
              </div>

              <div className="mt-8 flex flex-wrap gap-3">
                <Link
                  href={`/produtos/editar/${produto.id}`}
                  className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-400"
                >
                  Editar produto
                </Link>
                <Link
                  href="/produtos"
                  className="rounded-xl border border-white/10 px-5 py-3 font-semibold text-zinc-200 hover:bg-white/5"
                >
                  Voltar à listagem
                </Link>
              </div>
            </div>
          </div>
        )}
      </section>
    </main>
  );
}

export default function ProdutoDetalhesPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 p-10 text-center text-zinc-400">
          Carregando página...
        </main>
      }
    >
      <DetalhesProduto />
    </Suspense>
  );
}