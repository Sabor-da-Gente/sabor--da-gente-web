"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setCarregando(true);
    setErro("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password: senha,
    });

    if (error) {
      setErro("Falha ao entrar: " + error.message);
      setCarregando(false);
    } else {
      router.push("/");
      router.refresh();
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-zinc-950 p-6 text-white">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-8 shadow-2xl">
        <div className="text-center">
          <span className="text-4xl">🍕</span>
          <h1 className="mt-3 text-2xl font-bold tracking-tight text-white">
            Sabor da Gente
          </h1>
          <p className="mt-1 text-sm text-zinc-400">
            Acesso ao Painel Administrativo
          </p>
        </div>

        {erro && (
          <div
            role="alert"
            className="mt-6 rounded-xl border border-red-800 bg-red-950/60 p-3 text-sm text-red-300"
          >
            {erro}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label
              htmlFor="email"
              className="block text-sm font-medium text-zinc-300"
            >
              E-mail
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="admin@sabordagente.com"
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-orange-500"
            />
          </div>

          <div>
            <label
              htmlFor="senha"
              className="block text-sm font-medium text-zinc-300"
            >
              Senha
            </label>
            <input
              id="senha"
              type="password"
              required
              value={senha}
              onChange={(e) => setSenha(e.target.value)}
              placeholder="••••••••"
              className="mt-1.5 w-full rounded-xl border border-zinc-700 bg-zinc-950 px-4 py-3 text-white outline-none focus:border-orange-500"
            />
          </div>

          <button
            type="submit"
            disabled={carregando}
            className="w-full rounded-xl bg-orange-500 py-3 font-semibold text-white transition hover:bg-orange-600 disabled:opacity-50"
          >
            {carregando ? "Acessando..." : "Entrar no Painel"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-zinc-500">
          Uso restrito para a equipe da pizzaria
        </p>
      </div>
    </main>
  );
}