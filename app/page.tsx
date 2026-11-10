"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function Home() {
  const router = useRouter();
  const [usuarioEmail, setUsuarioEmail] = useState<string | null>(null);

  useEffect(() => {
    async function checarUsuario() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        router.push("/login");
      } else {
        setUsuarioEmail(data.user.email ?? "Administrador");
      }
    }
    void checarUsuario();
  }, [router]);

  async function handleSair() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <main className="min-h-screen bg-zinc-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-6xl">
        <header className="mb-12 flex flex-col gap-4 border-b border-zinc-800 pb-8 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mb-2 text-sm font-semibold uppercase tracking-[0.25em] text-orange-400">
              Painel administrativo
            </p>
            <h1 className="text-4xl font-bold tracking-tight">
              Sabor da Gente
            </h1>
            <p className="mt-3 text-zinc-400">
              Gerencie os produtos, acompanhe pedidos e veja métricas da pizzaria.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <span className="w-fit rounded-full border border-green-800 bg-green-950 px-4 py-2 text-sm text-green-300">
              {usuarioEmail ?? "Painel de gerenciamento"}
            </span>
            <button
              onClick={handleSair}
              className="rounded-xl border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm text-zinc-300 hover:border-red-600 hover:text-red-400"
            >
              Sair
            </button>
          </div>
        </header>

        <section className="mb-10">
          <h2 className="mb-2 text-2xl font-semibold">Visão geral</h2>
          <p className="text-zinc-400">
            Escolha uma área para começar a trabalhar.
          </p>
        </section>

        <section className="grid gap-6 md:grid-cols-3">
          <Link
            href="/produtos"
            className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-7 transition hover:border-orange-500 hover:bg-zinc-900/70"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/15 text-3xl">
              🍕
            </div>
            <h3 className="text-xl font-bold group-hover:text-orange-400">
              Gerenciar produtos
            </h3>
            <p className="mt-3 leading-7 text-zinc-400">
              Cadastre novos itens, consulte detalhes, edite informações e
              organize o cardápio.
            </p>
            <p className="mt-6 font-semibold text-orange-400">
              Acessar produtos →
            </p>
          </Link>

          <Link
            href="/pedidos"
            className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-7 transition hover:border-orange-500 hover:bg-zinc-900/70"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/15 text-3xl">
              📋
            </div>
            <h3 className="text-xl font-bold group-hover:text-orange-400">
              Gerenciar pedidos
            </h3>
            <p className="mt-3 leading-7 text-zinc-400">
              Acompanhe pedidos do dia, filtre histórico e faça a troca estrita de
              status dos pedidos.
            </p>
            <p className="mt-6 font-semibold text-orange-400">
              Acessar pedidos →
            </p>
          </Link>

          <Link
            href="/dashboard"
            className="group rounded-2xl border border-zinc-800 bg-zinc-900 p-7 transition hover:border-orange-500 hover:bg-zinc-900/70"
          >
            <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-xl bg-orange-500/15 text-3xl">
              📊
            </div>
            <h3 className="text-xl font-bold group-hover:text-orange-400">
              Dashboard & Relatórios
            </h3>
            <p className="mt-3 leading-7 text-zinc-400">
              Monitoramento em tempo real de faturamento, gráficos de vendas e
              formas de pagamento.
            </p>
            <p className="mt-6 font-semibold text-orange-400">
              Acessar dashboard →
            </p>
          </Link>
        </section>

        <footer className="mt-12 border-t border-zinc-800 pt-6 text-sm text-zinc-500">
          Sabor da Gente · Sistema de gerenciamento da pizzaria
        </footer>
      </div>
    </main>
  );
}