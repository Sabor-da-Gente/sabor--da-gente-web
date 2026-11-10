
"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

type Categoria = {
  id: number;
  nome: string;
};

export default function NovoProdutoPage() {
  const router = useRouter();

  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [categoriaId, setCategoriaId] = useState("");
  const [nome, setNome] = useState("");
  const [descricao, setDescricao] = useState("");
  const [tamanho, setTamanho] = useState("");
  const [preco, setPreco] = useState("");
  const [imagemUrl, setImagemUrl] = useState("");
  const [destaque, setDestaque] = useState(false);
  const [ativo, setAtivo] = useState(true);
  const [carregandoCategorias, setCarregandoCategorias] = useState(true);
  const [salvando, setSalvando] = useState(false);
  const [erro, setErro] = useState("");
  const [sucesso, setSucesso] = useState("");

  useEffect(() => {
    async function carregarCategorias() {
      const { data, error } = await supabase
        .from("categorias")
        .select("id, nome")
        .eq("ativa", true)
        .order("ordem");

      if (error) {
        setErro("Não foi possível carregar as categorias: " + error.message);
      } else {
        setCategorias(data ?? []);
      }

      setCarregandoCategorias(false);
    }

    carregarCategorias();
  }, []);

  async function cadastrarProduto(evento: FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setErro("");
    setSucesso("");

    const precoNumerico = Number(preco.replace(",", "."));

    if (!categoriaId) {
      setErro("Selecione uma categoria.");
      return;
    }

    if (nome.trim().length < 3) {
      setErro("O nome deve ter pelo menos 3 caracteres.");
      return;
    }

    if (preco.trim() === "" || !Number.isFinite(precoNumerico) || precoNumerico < 0) {
      setErro("Informe um preço válido e maior ou igual a zero.");
      return;
    }

    if (tamanho && !["Pequena", "Média", "Grande", "Família"].includes(tamanho)) {
      setErro("Selecione um tamanho válido.");
      return;
    }

    setSalvando(true);

    const { error } = await supabase.from("produtos").insert({
      categoria_id: Number(categoriaId),
      nome: nome.trim(),
      descricao: descricao.trim() || null,
      tamanho: tamanho || null,
      imagem_url: imagemUrl.trim() || null,
      preco: Math.round(precoNumerico * 100),
      destaque,
      ativo,
    });

    setSalvando(false);

    if (error) {
      setErro("Não foi possível cadastrar o produto: " + error.message);
      return;
    }

    setSucesso("Produto cadastrado com sucesso!");

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
        <h1 className="text-3xl font-bold sm:text-4xl">Novo produto</h1>
        <p className="mt-2 mb-8 text-zinc-400">
          Preencha os dados para adicionar um item ao cardápio.
        </p>

        {erro && (
          <div role="alert" className="mb-5 break-words rounded-xl border border-red-500/30 bg-red-950/40 p-4 text-red-300">
            {erro}
          </div>
        )}

        {sucesso && (
          <div role="status" className="mb-5 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-4 text-emerald-300">
            {sucesso}
          </div>
        )}

        <form
          onSubmit={cadastrarProduto}
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
            <label htmlFor="categoria" className="mb-2 block text-sm font-medium">
              Categoria *
            </label>
            <select
              id="categoria"
              required
              value={categoriaId}
              onChange={(e) => setCategoriaId(e.target.value)}
              disabled={carregandoCategorias || categorias.length === 0}
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 outline-none focus:border-orange-400"
            >
              <option value="">
                {carregandoCategorias ? "Carregando categorias..." : "Selecione uma categoria"}
              </option>
              {categorias.map((categoria) => (
                <option key={categoria.id} value={String(categoria.id)}>
                  {categoria.nome}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label htmlFor="descricao" className="mb-2 block text-sm font-medium">
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
              <label htmlFor="tamanho" className="mb-2 block text-sm font-medium">
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
              <label htmlFor="preco" className="mb-2 block text-sm font-medium">
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
                placeholder="Ex.: 38,00"
                className="w-full rounded-xl border border-white/10 bg-zinc-950 px-4 py-3 outline-none focus:border-orange-400"
              />
              <p className="mt-1 text-xs text-zinc-500">
                Exemplo: digite 38.00 para R$ 38,00.
              </p>
            </div>
          </div>

          <div>
            <label htmlFor="imagem" className="mb-2 block text-sm font-medium">
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
              disabled={salvando || carregandoCategorias || categorias.length === 0}
              className="rounded-xl bg-orange-500 px-5 py-3 font-semibold text-white hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {salvando ? "Salvando..." : "Cadastrar produto"}
            </button>
          </div>
        </form>
      </section>
    </main>
  );
}
