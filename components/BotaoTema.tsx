"use client";

import { useEffect, useSyncExternalStore } from "react";

const CHAVE = "tema-painel";
type Tema = "light" | "dark";

function lerSalvo(): Tema {
  try {
    return localStorage.getItem(CHAVE) === "light" ? "light" : "dark";
  } catch {
    return "dark";
  }
}

function assinar(aoMudar: () => void) {
  window.addEventListener("tema-alterado", aoMudar);
  return () => window.removeEventListener("tema-alterado", aoMudar);
}

function temaAtual(): Tema {
  return document.documentElement.dataset.theme === "light" ? "light" : "dark";
}

function definirTema(tema: Tema) {
  document.documentElement.dataset.theme = tema;
  try {
    localStorage.setItem(CHAVE, tema);
  } catch {
    // sem localStorage: o tema vale só nesta sessão
  }
  window.dispatchEvent(new Event("tema-alterado"));
}

export default function BotaoTema() {
  const tema = useSyncExternalStore<Tema>(assinar, temaAtual, () => "dark");

  // Aplica a preferência salva ao carregar a página
  useEffect(() => {
    const salvo = lerSalvo();
    if (document.documentElement.dataset.theme !== salvo) {
      document.documentElement.dataset.theme = salvo;
      window.dispatchEvent(new Event("tema-alterado"));
    }
  }, []);

  const proximo: Tema = tema === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      onClick={() => definirTema(proximo)}
      aria-label={proximo === "light" ? "Ativar tema claro" : "Ativar tema escuro"}
      title={proximo === "light" ? "Ativar tema claro" : "Ativar tema escuro"}
      className="fixed bottom-4 right-4 z-40 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 shadow-lg transition hover:border-orange-500"
    >
      {tema === "light" ? "🌙 Tema escuro" : "☀️ Tema claro"}
    </button>
  );
}
