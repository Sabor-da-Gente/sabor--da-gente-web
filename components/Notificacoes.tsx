"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";
import type { RealtimePostgresChangesPayload } from "@supabase/supabase-js";
import { supabase } from "@/lib/supabase";

const CHAVE = "notificacoes-painel";

type Aviso = { id: number; titulo: string; corpo: string };

function suportaNotificacao() {
  return typeof window !== "undefined" && "Notification" in window;
}

// "on|granted", "off|default", "off|unsupported"...
function lerEstado(): string {
  let preferencia = "off";
  try {
    preferencia = localStorage.getItem(CHAVE) === "on" ? "on" : "off";
  } catch {
    // sem localStorage: fica desligado
  }
  const permissao = suportaNotificacao() ? Notification.permission : "unsupported";
  return `${preferencia}|${permissao}`;
}

function assinar(aoMudar: () => void) {
  window.addEventListener("notificacoes-alteradas", aoMudar);
  return () => window.removeEventListener("notificacoes-alteradas", aoMudar);
}

function gravarPreferencia(valor: "on" | "off") {
  try {
    localStorage.setItem(CHAVE, valor);
  } catch {
    // ignora
  }
  window.dispatchEvent(new Event("notificacoes-alteradas"));
}

function moeda(centavos: unknown) {
  const valor = Number(centavos);
  if (!Number.isFinite(valor)) return "valor indisponível";
  return (valor / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function texto(valor: unknown, padrao: string) {
  return typeof valor === "string" && valor.trim() ? valor.trim() : padrao;
}

export default function Notificacoes() {
  const estado = useSyncExternalStore(assinar, lerEstado, () => "off|default");
  const [preferencia, permissao] = estado.split("|");
  const ativa = preferencia === "on";

  const [avisos, setAvisos] = useState<Aviso[]>([]);
  const vistos = useRef<Set<string>>(new Set());
  const contador = useRef(0);

  const mostrarAviso = useCallback((titulo: string, corpo: string) => {
    contador.current += 1;
    const id = contador.current;
    setAvisos((atuais) => [...atuais, { id, titulo, corpo }]);
    window.setTimeout(() => {
      setAvisos((atuais) => atuais.filter((aviso) => aviso.id !== id));
    }, 8000);
  }, []);

  const notificar = useCallback(
    (chave: string, titulo: string, corpo: string) => {
      if (vistos.current.has(chave)) return; // evita duplicatas do mesmo evento
      vistos.current.add(chave);

      if (suportaNotificacao() && Notification.permission === "granted") {
        try {
          const notificacao = new Notification(titulo, { body: corpo, tag: chave });
          notificacao.onclick = () => {
            window.focus();
            notificacao.close();
          };
          return;
        } catch {
          // cai no aviso dentro do painel
        }
      }
      mostrarAviso(titulo, corpo);
    },
    [mostrarAviso]
  );

  useEffect(() => {
    if (!ativa) return;

    const canal = supabase
      .channel(`notificacoes-${Date.now()}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        (payload: RealtimePostgresChangesPayload<Record<string, unknown>>) => {
          if (payload.eventType === "INSERT") {
            const p = payload.new;
            const entrega = p.tipo_entrega === "entrega" ? "Entrega" : "Retirada";
            notificar(
              `${String(p.id)}:novo`,
              `Novo pedido #${String(p.numero)}`,
              `${texto(p.cliente_nome, "Cliente")} · ${moeda(p.total)} · ${entrega}`
            );
          } else if (payload.eventType === "UPDATE") {
            const p = payload.new;
            // Cancelamento pelo painel sempre tem motivo; sem motivo = cliente cancelou
            if (p.status === "cancelado" && !texto(p.motivo_cancelamento, "")) {
              notificar(
                `${String(p.id)}:cancelado`,
                `Pedido #${String(p.numero)} cancelado pelo cliente`,
                `${texto(p.cliente_nome, "Cliente")} · ${moeda(p.total)}`
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [ativa, notificar]);

  async function alternar() {
    if (ativa) {
      gravarPreferencia("off");
      return;
    }

    if (suportaNotificacao() && Notification.permission === "default") {
      try {
        await Notification.requestPermission();
      } catch {
        // segue sem permissão
      }
    }
    gravarPreferencia("on");

    if (!suportaNotificacao() || Notification.permission !== "granted") {
      mostrarAviso(
        "Notificações ligadas",
        "O navegador não permite notificações do sistema; os avisos aparecerão aqui no painel."
      );
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => void alternar()}
        aria-pressed={ativa}
        title={
          permissao === "denied"
            ? "Bloqueadas no navegador: os avisos aparecem dentro do painel"
            : undefined
        }
        className="fixed bottom-16 right-4 z-40 rounded-full border border-zinc-700 bg-zinc-900 px-4 py-2 text-sm font-medium text-zinc-200 shadow-lg transition hover:border-orange-500"
      >
        {ativa ? "🔔 Notificações ligadas" : "🔕 Ativar notificações"}
      </button>

      <div
        aria-live="polite"
        className="fixed right-4 top-4 z-50 flex w-80 max-w-[calc(100vw-2rem)] flex-col gap-2"
      >
        {avisos.map((aviso) => (
          <div
            key={aviso.id}
            role="status"
            onClick={() =>
              setAvisos((atuais) => atuais.filter((a) => a.id !== aviso.id))
            }
            className="cursor-pointer rounded-xl border border-orange-500/40 bg-zinc-900 p-4 text-sm text-zinc-300 shadow-xl"
          >
            <p className="font-semibold text-orange-400">{aviso.titulo}</p>
            <p className="mt-1">{aviso.corpo}</p>
          </div>
        ))}
      </div>
    </>
  );
}
