"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";

type Pedido = {
  id: string;
  numero: number;
  cliente_nome: string;
  cliente_telefone: string;
  tipo_entrega: string;
  endereco_entrega: string | null;
  forma_pagamento: string;
  troco_para: number | null;
  total: number;
  status: string;
  criado_em: string;
  motivo_cancelamento?: string | null;
};

type ItemPedido = {
  id: number;
  pedido_id: string;
  nome: string;
  sabores: unknown;
  quantidade: number;
  preco_unitario: number;
};

const ITENS_POR_PAGINA = 5;

function formatarMoeda(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data: string) {
  const valor = new Date(data);
  if (Number.isNaN(valor.getTime())) return "Data indisponível";
  return valor.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function nomeStatus(status: string) {
  switch (status) {
    case "recebido":
      return "Recebido";
    case "em_preparo":
      return "Em preparo";
    case "saiu_para_entrega":
      return "Saiu para entrega";
    case "pronto_para_retirada":
      return "Pronto para retirada";
    case "entregue":
      return "Entregue";
    case "cancelado":
      return "Cancelado";
    default:
      return status.replaceAll("_", " ");
  }
}

function corStatus(status: string) {
  switch (status) {
    case "recebido":
      return "bg-sky-950 text-sky-300";
    case "em_preparo":
      return "bg-amber-950 text-amber-300";
    case "saiu_para_entrega":
      return "bg-violet-950 text-violet-300";
    case "pronto_para_retirada":
      return "bg-fuchsia-950 text-fuchsia-300";
    case "entregue":
      return "bg-emerald-950 text-emerald-300";
    case "cancelado":
      return "bg-red-950 text-red-300";
    default:
      return "bg-slate-800 text-slate-300";
  }
}

function textoSabores(sabores: unknown) {
  if (sabores == null || sabores === "") return "";
  if (typeof sabores === "string") return sabores;
  if (Array.isArray(sabores)) return sabores.join(", ");
  try {
    return JSON.stringify(sabores);
  } catch {
    return String(sabores);
  }
}

export default function PedidosPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [busca, setBusca] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("todos");
  const [periodo, setPeriodo] = useState<"hoje" | "historico">("hoje");
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState<string | null>(null);
  const [pedidoAberto, setPedidoAberto] = useState<string | null>(null);
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [carregandoItens, setCarregandoItens] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");
  const [paginaAtual, setPaginaAtual] = useState(1);

  // Modal de Cancelamento
  const [modalCancelar, setModalCancelar] = useState<{
    aberto: boolean;
    pedido: Pedido | null;
  }>({ aberto: false, pedido: null });
  const [motivoCancelamento, setMotivoCancelamento] = useState("");

  // 1. CARREGAR PEDIDOS DECLARADO PRIMEIRO PARA EVITAR ERRO DE ESCOPO
  const carregarPedidos = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      let query = supabase
        .from("pedidos")
        .select(
          "id, numero, cliente_nome, cliente_telefone, tipo_entrega, endereco_entrega, forma_pagamento, troco_para, total, status, criado_em, motivo_cancelamento"
        )
        .order("criado_em", { ascending: false });

      if (periodo === "hoje") {
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        query = query.gte("criado_em", hoje.toISOString());
      }

      const { data, error } = await query;
      if (error) throw new Error(error.message);
      setPedidos((data ?? []) as Pedido[]);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os pedidos."
      );
    } finally {
      setCarregando(false);
    }
  }, [periodo]);

  useEffect(() => {
    void carregarPedidos();
  }, [carregarPedidos]);

  const pedidosFiltrados = useMemo(() => {
    const termo = busca.trim().toLocaleLowerCase("pt-BR");

    return pedidos.filter((pedido) => {
      const correspondeBusca =
        String(pedido.numero).includes(termo) ||
        (pedido.cliente_nome ?? "")
          .toLocaleLowerCase("pt-BR")
          .includes(termo) ||
        (pedido.cliente_telefone ?? "").includes(termo);

      const correspondeStatus =
        filtroStatus === "todos" || pedido.status === filtroStatus;

      return correspondeBusca && correspondeStatus;
    });
  }, [pedidos, busca, filtroStatus]);

  // Paginação
  const totalPaginas = Math.ceil(pedidosFiltrados.length / ITENS_POR_PAGINA) || 1;
  const pedidosPaginados = useMemo(() => {
    const inicio = (paginaAtual - 1) * ITENS_POR_PAGINA;
    return pedidosFiltrados.slice(inicio, inicio + ITENS_POR_PAGINA);
  }, [pedidosFiltrados, paginaAtual]);

  useEffect(() => {
    setPaginaAtual(1);
  }, [busca, filtroStatus, periodo]);

  async function abrirDetalhes(pedidoId: string) {
    if (pedidoAberto === pedidoId) {
      setPedidoAberto(null);
      setItens([]);
      return;
    }

    setPedidoAberto(pedidoId);
    setItens([]);
    setCarregandoItens(true);
    setErro("");

    try {
      const { data, error } = await supabase
        .from("itens_pedido")
        .select("id, pedido_id, nome, sabores, quantidade, preco_unitario")
        .eq("pedido_id", pedidoId)
        .order("id", { ascending: true });

      if (error) throw new Error(error.message);
      setItens((data ?? []) as ItemPedido[]);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível carregar os itens do pedido."
      );
    } finally {
      setCarregandoItens(false);
    }
  }

  // Transições de status válidas
  function obterAcoesPermitidas(pedido: Pedido) {
    if (pedido.status === "entregue" || pedido.status === "cancelado") {
      return [];
    }

    const acoes: { status: string; label: string; variante: "padrao" | "cancelar" }[] = [];

    if (pedido.status === "recebido") {
      acoes.push({
        status: "em_preparo",
        label: "Iniciar Preparo",
        variante: "padrao",
      });
    } else if (pedido.status === "em_preparo") {
      const isRetirada = (pedido.tipo_entrega || "").toLowerCase().includes("retirada");
      if (isRetirada) {
        acoes.push({
          status: "pronto_para_retirada",
          label: "Pronto para Retirada",
          variante: "padrao",
        });
      } else {
        acoes.push({
          status: "saiu_para_entrega",
          label: "Saiu para Entrega",
          variante: "padrao",
        });
      }
    } else if (
      pedido.status === "saiu_para_entrega" ||
      pedido.status === "pronto_para_retirada"
    ) {
      acoes.push({
        status: "entregue",
        label: "Concluir (Entregue)",
        variante: "padrao",
      });
    }

    // Cancelamento liberado enquanto não entregue
    acoes.push({
      status: "cancelado",
      label: "Cancelar",
      variante: "cancelar",
    });

    return acoes;
  }

  async function atualizarStatusBanco(pedidoId: string, novoStatus: string, motivo?: string) {
    setAtualizando(pedidoId);
    setErro("");
    setMensagem("");

    try {
      const payload: { status: string; motivo_cancelamento?: string } = {
        status: novoStatus,
      };
      if (motivo) {
        payload.motivo_cancelamento = motivo;
      }

      const { data, error } = await supabase
        .from("pedidos")
        .update(payload)
        .eq("id", pedidoId)
        .select("id, status")
        .maybeSingle();

      if (error) throw new Error(error.message);
      if (!data) throw new Error("A alteração não foi confirmada pelo banco.");

      setPedidos((atuais) =>
        atuais.map((item) =>
          item.id === pedidoId
            ? {
                ...item,
                status: novoStatus,
                motivo_cancelamento: motivo ?? item.motivo_cancelamento,
              }
            : item
        )
      );

      setMensagem(`Status do pedido atualizado para "${nomeStatus(novoStatus)}".`);
    } catch (error) {
      setErro(
        error instanceof Error ? error.message : "Erro ao atualizar status."
      );
    } finally {
      setAtualizando(null);
    }
  }

  function dispararAcaoStatus(pedido: Pedido, proximoStatus: string) {
    if (proximoStatus === "cancelado") {
      setModalCancelar({ aberto: true, pedido });
      setMotivoCancelamento("");
      return;
    }

    if (
      window.confirm(
        `Deseja mudar o status do pedido #${pedido.numero} para "${nomeStatus(proximoStatus)}"?`
      )
    ) {
      void atualizarStatusBanco(pedido.id, proximoStatus);
    }
  }

  async function confirmarCancelamentoModal() {
    if (!modalCancelar.pedido) return;
    if (!motivoCancelamento.trim()) {
      alert("Por favor, digite o motivo do cancelamento para o cliente.");
      return;
    }

    const { id } = modalCancelar.pedido;
    await atualizarStatusBanco(id, "cancelado", motivoCancelamento.trim());
    setModalCancelar({ aberto: false, pedido: null });
  }

  return (
    <main className="min-h-screen bg-slate-950 px-4 py-8 text-white sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="mb-3 inline-block text-sm text-orange-400 hover:text-orange-300"
            >
              ← Voltar ao início
            </Link>
            <h1 className="text-3xl font-bold sm:text-4xl">
              Gerenciamento de pedidos
            </h1>
            <p className="mt-2 text-slate-400">
              Consulte pedidos de hoje ou histórico com fluxo controlado.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => void carregarPedidos()}
              disabled={carregando}
              className="rounded-xl border border-slate-700 px-5 py-3 font-semibold transition hover:bg-slate-800 disabled:opacity-50"
            >
              {carregando ? "Carregando..." : "Atualizar"}
            </button>
          </div>
        </header>

        {mensagem && (
          <div
            role="status"
            className="mb-5 rounded-xl border border-emerald-800 bg-emerald-950/50 p-4 text-emerald-300"
          >
            {mensagem}
          </div>
        )}

        {erro && (
          <div
            role="alert"
            className="mb-5 rounded-xl border border-red-800 bg-red-950/50 p-4 text-red-300"
          >
            <p className="font-semibold">Ocorreu um problema</p>
            <p className="mt-1 break-words text-sm">{erro}</p>
          </div>
        )}

        {/* Abas: Pedidos de Hoje x Histórico */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setPeriodo("hoje")}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              periodo === "hoje"
                ? "bg-orange-500 text-white"
                : "border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            📅 Pedidos de Hoje
          </button>
          <button
            onClick={() => setPeriodo("historico")}
            className={`rounded-xl px-5 py-2.5 text-sm font-semibold transition ${
              periodo === "historico"
                ? "bg-orange-500 text-white"
                : "border border-slate-800 bg-slate-900 text-slate-400 hover:text-white"
            }`}
          >
            🗂️ Histórico Completo
          </button>
        </div>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
          <div className="mb-6 grid grid-cols-1 gap-4 md:grid-cols-2">
            <div>
              <label
                htmlFor="busca-pedido"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Buscar pedido
              </label>
              <input
                id="busca-pedido"
                type="search"
                value={busca}
                onChange={(e) => setBusca(e.target.value)}
                placeholder="Número, nome ou telefone..."
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
              />
            </div>

            <div>
              <label
                htmlFor="filtro-status"
                className="mb-2 block text-sm font-medium text-slate-300"
              >
                Filtrar por status
              </label>
              <select
                id="filtro-status"
                value={filtroStatus}
                onChange={(e) => setFiltroStatus(e.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
              >
                <option value="todos">Todos os status</option>
                <option value="recebido">Recebido</option>
                <option value="em_preparo">Em preparo</option>
                <option value="saiu_para_entrega">Saiu para entrega</option>
                <option value="pronto_para_retirada">Pronto para retirada</option>
                <option value="entregue">Entregue</option>
                <option value="cancelado">Cancelado</option>
              </select>
            </div>
          </div>

          {carregando ? (
            <div className="py-16 text-center text-slate-400" role="status">
              Carregando pedidos...
            </div>
          ) : pedidosPaginados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 px-4 py-12 text-center">
              <p className="text-4xl">🧾</p>
              <h3 className="mt-4 text-lg font-semibold">
                Nenhum pedido encontrado
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                {periodo === "hoje"
                  ? "Não há pedidos registrados para a data de hoje. Você pode consultar o histórico acima."
                  : "Nenhum pedido corresponde aos filtros informados."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pedidosPaginados.map((pedido) => {
                const acoes = obterAcoesPermitidas(pedido);

                return (
                  <article
                    key={pedido.id}
                    className="overflow-hidden rounded-xl border border-slate-800 bg-slate-950"
                  >
                    <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-[1fr_auto] lg:items-center">
                      <div>
                        <div className="flex flex-wrap items-center gap-3">
                          <h3 className="text-lg font-bold">
                            Pedido #{pedido.numero}
                          </h3>
                          <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${corStatus(
                              pedido.status
                            )}`}
                          >
                            {nomeStatus(pedido.status)}
                          </span>
                        </div>

                        <p className="mt-2 font-medium">{pedido.cliente_nome}</p>
                        <p className="mt-1 text-sm text-slate-400">
                          Telefone: {pedido.cliente_telefone}
                        </p>
                        <p className="mt-1 text-sm text-slate-400">
                          Criado em: {formatarData(pedido.criado_em)}
                        </p>
                        <p className="mt-2 text-lg font-bold text-orange-400">
                          {formatarMoeda(pedido.total)}
                        </p>

                        {pedido.motivo_cancelamento && (
                          <div className="mt-2 rounded-lg border border-red-900 bg-red-950/40 p-2 text-xs text-red-300">
                            <strong>Motivo do cancelamento:</strong>{" "}
                            {pedido.motivo_cancelamento}
                          </div>
                        )}
                      </div>

                      <div className="flex flex-col gap-2">
                        {acoes.length > 0 ? (
                          <div className="flex flex-wrap gap-2">
                            {acoes.map((acao) => (
                              <button
                                key={acao.status}
                                type="button"
                                disabled={atualizando === pedido.id}
                                onClick={() =>
                                  dispararAcaoStatus(pedido, acao.status)
                                }
                                className={`rounded-lg px-3 py-2 text-xs font-semibold transition disabled:opacity-50 ${
                                  acao.variante === "cancelar"
                                    ? "border border-red-800 text-red-300 hover:bg-red-950"
                                    : "bg-orange-500 text-white hover:bg-orange-600"
                                }`}
                              >
                                {acao.label}
                              </button>
                            ))}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-500">
                            Finalizado ({nomeStatus(pedido.status)})
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={() => void abrirDetalhes(pedido.id)}
                          className="mt-2 rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:border-orange-500 hover:text-orange-300"
                        >
                          {pedidoAberto === pedido.id
                            ? "Ocultar detalhes"
                            : "Ver detalhes"}
                        </button>
                      </div>
                    </div>

                    {pedidoAberto === pedido.id && (
                      <div className="border-t border-slate-800 bg-slate-900/70 p-4">
                        <h4 className="mb-4 font-semibold">Detalhes do pedido</h4>
                        <div className="mb-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                          <div>
                            <p className="text-slate-400">Tipo de entrega</p>
                            <p className="mt-1 capitalize">{pedido.tipo_entrega}</p>
                          </div>

                          <div>
                            <p className="text-slate-400">Forma de pagamento</p>
                            <p className="mt-1 uppercase">{pedido.forma_pagamento}</p>
                          </div>

                          {pedido.endereco_entrega && (
                            <div className="sm:col-span-2">
                              <p className="text-slate-400">Endereço de entrega</p>
                              <p className="mt-1">{pedido.endereco_entrega}</p>
                            </div>
                          )}

                          {pedido.troco_para != null && (
                            <div>
                              <p className="text-slate-400">Troco para</p>
                              <p className="mt-1">{formatarMoeda(pedido.troco_para)}</p>
                            </div>
                          )}
                        </div>

                        <h4 className="mb-3 font-semibold">Itens do pedido</h4>
                        {carregandoItens ? (
                          <p className="text-sm text-slate-400">
                            Carregando itens...
                          </p>
                        ) : itens.length === 0 ? (
                          <p className="text-sm text-slate-400">
                            Nenhum item encontrado para este pedido.
                          </p>
                        ) : (
                          <div className="space-y-3">
                            {itens.map((item) => (
                              <div
                                key={item.id}
                                className="flex flex-col justify-between gap-2 rounded-lg border border-slate-800 bg-slate-950 p-3 sm:flex-row sm:items-center"
                              >
                                <div>
                                  <p className="font-medium">{item.nome}</p>
                                  {textoSabores(item.sabores) && (
                                    <p className="mt-1 text-sm text-slate-400">
                                      Sabores: {textoSabores(item.sabores)}
                                    </p>
                                  )}
                                  <p className="mt-1 text-sm text-slate-400">
                                    Quantidade: {item.quantidade}
                                  </p>
                                </div>
                                <div className="sm:text-right">
                                  <p className="font-semibold text-orange-400">
                                    {formatarMoeda(item.preco_unitario)}
                                  </p>
                                  <p className="mt-1 text-xs text-slate-400">
                                    Unitário
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </article>
                );
              })}

              {/* Paginação */}
              <div className="mt-6 flex flex-wrap items-center justify-between gap-4 border-t border-slate-800 pt-4 text-sm text-slate-400">
                <span>
                  Exibindo {pedidosPaginados.length} de {pedidosFiltrados.length}{" "}
                  pedidos (Página {paginaAtual} de {totalPaginas})
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
            </div>
          )}
        </section>

        {/* Modal de Cancelamento */}
        {modalCancelar.aberto && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4 backdrop-blur-xs">
            <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-900 p-6 shadow-2xl">
              <h3 className="text-xl font-bold text-red-400">
                Cancelar Pedido #{modalCancelar.pedido?.numero}
              </h3>
              <p className="mt-2 text-sm text-zinc-400">
                Escreva a mensagem/justificativa para o cliente informando o
                motivo do cancelamento:
              </p>

              <textarea
                rows={3}
                required
                value={motivoCancelamento}
                onChange={(e) => setMotivoCancelamento(e.target.value)}
                placeholder="Ex.: Ingredientes esgotados / Endereço fora da área de entrega."
                className="mt-4 w-full rounded-xl border border-zinc-700 bg-zinc-950 p-3 text-sm text-white outline-none focus:border-red-500"
              />

              <div className="mt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() =>
                    setModalCancelar({ aberto: false, pedido: null })
                  }
                  className="rounded-xl border border-zinc-700 px-4 py-2 text-sm font-semibold hover:bg-zinc-800"
                >
                  Voltar
                </button>
                <button
                  type="button"
                  onClick={() => void confirmarCancelamentoModal()}
                  className="rounded-xl bg-red-600 px-4 py-2 text-sm font-semibold text-white hover:bg-red-700"
                >
                  Confirmar Cancelamento
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}