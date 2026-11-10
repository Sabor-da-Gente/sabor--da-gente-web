
"use client";

import { Suspense, useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Categoria = {
  id: number;
  nome: string;
};

function EditarProdutoConteudo() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const id = Number(params.id);

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [preco, setPreco] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [destaque, setDestaque] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [carregando, setCarregando] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    let cancelado = false;

    async function carregarDados() {
      if (!Number.isSafeInteger(id) || id <= 0) {
        setErro("O identificador do produto é inválido.");
        setCarregando(false);
        return;
      }

      const [resultadoProduto, resultadoCategorias] = await Promise.all([
        supabase
          .from("produtos")
          .select(
            "id, categoria_id, nome, descricao, tamanho, preco, imagem_url, destaque, ativo"
          )
          .eq("id", id)
          .maybeSingle(),
        supabase
          .from("categorias")
          .select("id, nome")
          .eq("ativa", true)
          .order("ordem"),
      ]);

      if (cancelado) return;

      if (resultadoProduto.error) {
        setErro(
          "Não foi possível carregar o produto: " +
            resultadoProduto.error.message
        );
      } else if (!resultadoProduto.data) {
        setErro("Produto não encontrado.");
      } else if (resultadoCategorias.error) {
        setErro(
          "Não foi possível carregar as categorias: " +
            resultadoCategorias.error.message
        );
      } else {
        const produto = resultadoProduto.data;

        setCategorias(resultadoCategorias.data ?? []);
        setCategoriaId(String(produto.categoria_id));
        setNome(produto.nome);
        setDescricao(produto.descricao ?? "");
        setTamanho(produto.tamanho ?? "");
        setPreco((produto.preco / 100).toFixed(2));
        setImagemUrl(produto.imagem_url ?? "");
        setDestaque(produto.destaque);
        setAtivo(produto.ativo);
      }

      setCarregando(false);
    }

    carregarDados();

    return () => {
      cancelado = true;
    };
  }, [id]);

  async function salvarProduto(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    setSucesso("");

    const precoNumerico = Number(preco.replace(",", "."));

    if (!categoriaId) {
      setErro("Selecione uma categoria.");
      return;
    }

    if (nome.trim().length < 3 || nome.trim().length > 100) {
      setErro("O nome deve ter entre 3 e 100 caracteres.");
      return;
    }

    if (descricao.trim().length > 500) {
      setErro("A descrição deve ter no máximo 500 caracteres.");
      return;
    }

    if (
      preco.trim() === "" ||
      !Number.isFinite(precoNumerico) ||
      precoNumerico < 0 ||
      precoNumerico > 999999
    ) {
      setErro("Informe um preço válido entre R$ 0,00 e R$ 999.999,00.");
      return;
    }

    if (
      tamanho &&
      !["Pequena", "Média", "Grande", "Família"].includes(tamanho)
    ) {
      setErro("Selecione um tamanho válido.");
      return;
    }

    if (imagemUrl.trim()) {
      try {
        const url = new URL(imagemUrl.trim());

        if (url.protocol !== "http:" && url.protocol !== "https:") {
          setErro("A imagem deve usar um endereço HTTP ou HTTPS.");
          return;
        }
      } catch {
        setErro("Informe uma URL de imagem válida.");
        return;
      }
    }

    if (!Number.isSafeInteger(id) || id <= 0) {
      setErro("O identificador do produto é inválido.");
      return;
    }

    setSalvando(true);

    const { data, error } = await supabase
      .from("produtos")
      .update({
        categoria_id: Number(categoriaId),
        nome: nome.trim(),
        descricao: descricao.trim() || null,
        tamanho: tamanho || null,
        imagem_url: imagemUrl.trim() || null,
        preco: Math.round(precoNumerico * 100),
        destaque,
        ativo,
      })
      .eq("id", id)
      .select("id");

    setSalvando(false);

    if (error) {
      setErro("Não foi possível atualizar o produto: " + error.message);
      return;
    }

    if (!data || data.length === 0) {
      setErro(
        "Nenhuma alteração foi confirmada. Verifique as permissões de atualização no Supabase."
      );
      return;
    }

    setSucesso("Produto atualizado com sucesso!");

    window.setTimeout(() => {
      router.push("/produtos");
      router.refresh();
    }, 1000);
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-zinc-100">
      <header className="border-b border-white/10 bg-zinc-900">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-4 px-6 py-5">
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

      <section className="mx-auto max-w-3xl px-6 py-10">
        <p className="mb-2 text-sm font-semibold uppercase tracking-widest text-orange-400">
          Cardápio
        </p>

        <h1 className="text-3xl font-bold sm:text-4xl">Editar produto</h1>

        <p className="mb-8 mt-2 text-zinc-400">
          Altere as informações do produto selecionado.
        </p>

        {erro && (
          <div
            role="alert"
            className="mb-5 break-words rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-red-300"
          >
            {erro}
          </div>
        )}

        {sucesso && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-emerald-300"
          >
            {sucesso}
          </div>
        )}

        {carregando ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-900 p-8 text-center text-zinc-400">
            Carregando dados do produto...
          </div>
        ) : !erro ? (
          <form
            onSubmit={salvarProduto}
            className="space-y-6 rounded-2xl border border-white/10 bg-zinc-900 p-6"
          >
            <div>
              <label htmlFor="nome" className="mb-2 block text-sm font-medium">
                Nome do produto *
              </label>

              <input
                id="nome"
                required
                minLength={3}
                maxLength={100}
                value={nome}
                onChange={(e) => setNome(e.target.value)}
                placeholder="Ex.: Pizza de Calabresa"
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 outline-none focus:border-orange-400"
              />
            </div>

            <div>
              <label
                htmlFor="categoria"
                className="mb-2 block text-sm font-medium"
              >
                Categoria *
              </label>

              <select
                id="categoria"
                required
                value={categoriaId}
                onChange={(e) => setCategoriaId(e.target.value)}
                disabled={categorias.length === 0}
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 outline-none focus:border-orange-400"
              >
                <option value="">Selecione uma categoria</option>

                {categorias.map((categoria) => (
                  <option key={categoria.id} value={String(categoria.id)}>
                    {categoria.nome}
                  </option>
                ))}
              </select>

              {categorias.length === 0 && (
                <p className="mt-2 text-xs text-amber-300">
                  Nenhuma categoria ativa disponível.
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="descricao"
                className="mb-2 block text-sm font-medium"
              >
                Descrição
              </label>

              <textarea
                id="descricao"
                rows={3}
                maxLength={500}
                value={descricao}
                onChange={(e) => setDescricao(e.target.value)}
                placeholder="Descreva os ingredientes ou detalhes do produto."
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 outline-none focus:border-orange-400"
              />
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
              <div>
                <label
                  htmlFor="tamanho"
                  className="mb-2 block text-sm font-medium"
                >
                  Tamanho
                </label>

                <select
                  id="tamanho"
                  value={tamanho}
                  onChange={(e) => setTamanho(e.target.value)}
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 outline-none focus:border-orange-400"
                >
                  <option value="">Não se aplica</option>
                  <option value="Pequena">Pequena</option>
                  <option value="Média">Média</option>
                  <option value="Grande">Grande</option>
                  <option value="Família">Família</option>
                </select>
              </div>

              <div>
                <label
                  htmlFor="preco"
                  className="mb-2 block text-sm font-medium"
                >
                  Preço em reais (R$) *
                </label>

                <input
                  id="preco"
                  required
                  type="number"
                  min="0"
                  max="999999"
                  step="0.01"
                  value={preco}
                  onChange={(e) => setPreco(e.target.value)}
                  placeholder="38.00"
                  className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 outline-none focus:border-orange-400"
                />

                <p className="mt-1 text-xs text-zinc-500">
                  O preço é salvo em centavos no banco de dados.
                </p>
              </div>
            </div>

            <div>
              <label
                htmlFor="imagem"
                className="mb-2 block text-sm font-medium"
              >
                URL da imagem (opcional)
              </label>

              <input
                id="imagem"
                type="url"
                maxLength={2000}
                value={imagemUrl}
                onChange={(e) => setImagemUrl(e.target.value)}
                placeholder="https://exemplo.com/imagem.jpg"
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 outline-none focus:border-orange-400"
              />
            </div>

            <div className="flex flex-wrap gap-6">
              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={destaque}
                  onChange={(e) => setDestaque(e.target.checked)}
                  className="accent-orange-500"
                />
                Produto em destaque
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={ativo}
                  onChange={(e) => setAtivo(e.target.checked)}
                  className="accent-orange-500"
                />
                Produto ativo
              </label>
            </div>

            <div className="flex flex-wrap justify-end gap-3 border-t border-white/10 pt-5">
              <Link
                href="/produtos"
                className="rounded-xl border border-white/10 px-5 py-3 font-semibold hover:bg-white/5"
              >
                Cancelar
              </Link>

              <button
                type="submit"
                disabled={salvando || categorias.length === 0}
                className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {salvando ? "Salvando..." : "Salvar alterações"}
              </button>
            </div>
          </form>
        ) : null}
      </section>
    </main>
  );
}

export default function EditarProdutoPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen bg-zinc-950 p-10 text-center text-zinc-300">
          Carregando página de edição...
        </main>
      }
    >
      <EditarProdutoConteudo />
    </Suspense>
  );
}
