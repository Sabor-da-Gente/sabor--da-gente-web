
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
};

type ItemPedido = {
  id: number;
  pedido_id: string;
  nome: string;
  sabores: unknown;
  quantidade: number;
  preco_unitario: number;
};

const STATUS: { valor: string; rotulo: string }[] = [
  { valor: "recebido", rotulo: "Recebido" },
  { valor: "em_preparo", rotulo: "Em preparo" },
  { valor: "saiu_para_entrega", rotulo: "Saiu para entrega" },
  { valor: "pronto_para_retirada", rotulo: "Pronto para retirada" },
  { valor: "entregue", rotulo: "Entregue" },
  { valor: "cancelado", rotulo: "Cancelado" },
];

function formatarMoeda(centavos: number) {
  return (centavos / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function formatarData(data: string) {
  const valor = new Date(data);

  if (Number.isNaN(valor.getTime())) {
    return "Data indisponível";
  }

  return valor.toLocaleString("pt-BR", {
    dateStyle: "short",
    timeStyle: "short",
  });
}

function nomeStatus(status: string) {
  return (
    STATUS.find((opcao) => opcao.valor === status)?.rotulo ??
    status.replaceAll("_", " ")
  );
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
  if (sabores == null || sabores === "") {
    return "";
  }

  if (typeof sabores === "string") {
    return sabores;
  }

  if (Array.isArray(sabores)) {
    return sabores.join(", ");
  }

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
  const [carregando, setCarregando] = useState(true);
  const [atualizando, setAtualizando] = useState<string | null>(null);
  const [pedidoAberto, setPedidoAberto] = useState<string | null>(null);
  const [itens, setItens] = useState<ItemPedido[]>([]);
  const [carregandoItens, setCarregandoItens] = useState(false);
  const [erro, setErro] = useState("");
  const [mensagem, setMensagem] = useState("");

  const carregarPedidos = useCallback(async () => {
    setCarregando(true);
    setErro("");

    try {
      const { data, error } = await supabase
        .from("pedidos")
        .select(
          "id, numero, cliente_nome, cliente_telefone, tipo_entrega, endereco_entrega, forma_pagamento, troco_para, total, status, criado_em"
        )
        .order("criado_em", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }

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
  }, []);

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

      if (error) {
        throw new Error(error.message);
      }

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

  async function alterarStatus(pedido: Pedido, novoStatus: string) {
    if (novoStatus === pedido.status) {
      return;
    }

    const confirmado = window.confirm(
      `Alterar o status do pedido #${pedido.numero} para "${nomeStatus(novoStatus)}"?`
    );

    if (!confirmado) {
      return;
    }

    setAtualizando(pedido.id);
    setErro("");
    setMensagem("");

    try {
      const { data, error } = await supabase
        .from("pedidos")
        .update({ status: novoStatus })
        .eq("id", pedido.id)
        .select("id, status")
        .maybeSingle();

      if (error) {
        throw new Error(error.message);
      }

      if (!data) {
        throw new Error(
          "Nenhuma alteração foi confirmada. Verifique as permissões de atualização no Supabase."
        );
      }

      setPedidos((atuais) =>
        atuais.map((item) =>
          item.id === pedido.id
            ? { ...item, status: data.status }
            : item
        )
      );

      setMensagem(`Status do pedido #${pedido.numero} atualizado.`);
    } catch (error) {
      setErro(
        error instanceof Error
          ? error.message
          : "Não foi possível atualizar o status."
      );
    } finally {
      setAtualizando(null);
    }
  }

  const totalRecebidos = pedidos.filter(
    (pedido) => pedido.status === "recebido"
  ).length;

  const totalEmPreparo = pedidos.filter(
    (pedido) => pedido.status === "em_preparo"
  ).length;

  const totalEntregues = pedidos.filter(
    (pedido) => pedido.status === "entregue"
  ).length;

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
              Consulte os pedidos e acompanhe o andamento dos atendimentos.
            </p>
          </div>

          <button
            type="button"
            onClick={() => void carregarPedidos()}
            disabled={carregando}
            className="rounded-xl border border-slate-700 px-5 py-3 font-semibold transition hover:bg-slate-800 disabled:opacity-50"
          >
            {carregando ? "Carregando..." : "Atualizar pedidos"}
          </button>
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

        <section className="mb-8 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Total de pedidos</p>
            <p className="mt-3 text-3xl font-bold">{pedidos.length}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Recebidos</p>
            <p className="mt-3 text-3xl font-bold text-sky-300">
              {totalRecebidos}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Em preparo</p>
            <p className="mt-3 text-3xl font-bold text-amber-300">
              {totalEmPreparo}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm text-slate-400">Entregues</p>
            <p className="mt-3 text-3xl font-bold text-emerald-300">
              {totalEntregues}
            </p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-800 bg-slate-900 p-4 sm:p-6">
          <div className="mb-6">
            <h2 className="text-xl font-semibold">Lista de pedidos</h2>
            <p className="mt-1 text-sm text-slate-400">
              Pesquise pelo número, cliente ou telefone.
            </p>
          </div>

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
                onChange={(event) => setBusca(event.target.value)}
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
                onChange={(event) => setFiltroStatus(event.target.value)}
                className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-3 text-white outline-none focus:border-orange-500"
              >
                <option value="todos">Todos os status</option>
                {STATUS.map((status) => (
                  <option key={status.valor} value={status.valor}>
                    {status.rotulo}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {carregando ? (
            <div className="py-16 text-center text-slate-400" role="status">
              Carregando pedidos...
            </div>
          ) : pedidosFiltrados.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-700 px-4 py-12 text-center">
              <p className="text-4xl">🧾</p>
              <h3 className="mt-4 text-lg font-semibold">
                {pedidos.length === 0
                  ? "Nenhum pedido cadastrado"
                  : "Nenhum pedido encontrado"}
              </h3>
              <p className="mt-2 text-sm text-slate-400">
                {pedidos.length === 0
                  ? "Quando houver pedidos registrados no Supabase, eles aparecerão aqui."
                  : "Tente alterar a pesquisa ou o filtro de status."}
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {pedidosFiltrados.map((pedido) => (
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
                          className={`rounded-full px-3 py-1 text-xs font-semibold ${corStatus(pedido.status)}`}
                        >
                          {nomeStatus(pedido.status)}
                        </span>
                      </div>

                      <p className="mt-2 font-medium">
                        {pedido.cliente_nome}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        Telefone: {pedido.cliente_telefone}
                      </p>

                      <p className="mt-1 text-sm text-slate-400">
                        Criado em: {formatarData(pedido.criado_em)}
                      </p>

                      <p className="mt-2 text-lg font-bold text-orange-400">
                        {formatarMoeda(pedido.total)}
                      </p>
                    </div>

                    <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                      <div>
                        <label
                          htmlFor={`status-${pedido.id}`}
                          className="mb-1 block text-xs text-slate-400"
                        >
                          Alterar status
                        </label>

                        <select
                          id={`status-${pedido.id}`}
                          value={pedido.status}
                          disabled={atualizando === pedido.id}
                          onChange={(event) =>
                            void alterarStatus(pedido, event.target.value)
                          }
                          className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm outline-none focus:border-orange-500 disabled:opacity-50"
                        >
                          {!STATUS.some(
                            (status) => status.valor === pedido.status
                          ) && (
                            <option value={pedido.status}>
                              {nomeStatus(pedido.status)}
                            </option>
                          )}

                          {STATUS.map((status) => (
                            <option key={status.valor} value={status.valor}>
                              {status.rotulo}
                            </option>
                          ))}
                        </select>

                        {atualizando === pedido.id && (
                          <p className="mt-1 text-xs text-slate-400">
                            Salvando alteração...
                          </p>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => void abrirDetalhes(pedido.id)}
                        className="rounded-lg border border-slate-700 px-4 py-2 text-sm font-semibold transition hover:border-orange-500 hover:text-orange-300"
                      >
                        {pedidoAberto === pedido.id
                          ? "Ocultar detalhes"
                          : "Ver detalhes"}
                      </button>
                    </div>
                  </div>

                  {pedidoAberto === pedido.id && (
                    <div className="border-t border-slate-800 bg-slate-900/70 p-4">
                      <h4 className="mb-4 font-semibold">
                        Detalhes do pedido
                      </h4>

                      <div className="mb-5 grid grid-cols-1 gap-4 text-sm sm:grid-cols-2">
                        <div>
                          <p className="text-slate-400">Tipo de entrega</p>
                          <p className="mt-1">{pedido.tipo_entrega}</p>
                        </div>

                        <div>
                          <p className="text-slate-400">Forma de pagamento</p>
                          <p className="mt-1">{pedido.forma_pagamento}</p>
                        </div>

                        {pedido.endereco_entrega && (
                          <div className="sm:col-span-2">
                            <p className="text-slate-400">
                              Endereço de entrega
                            </p>
                            <p className="mt-1">
                              {pedido.endereco_entrega}
                            </p>
                          </div>
                        )}

                        {pedido.troco_para != null && (
                          <div>
                            <p className="text-slate-400">Troco para</p>
                            <p className="mt-1">
                              {formatarMoeda(pedido.troco_para)}
                            </p>
                          </div>
                        )}

                        <div className="sm:col-span-2">
                          <p className="text-slate-400">ID do pedido</p>
                          <p className="mt-1 break-all font-mono text-xs">
                            {pedido.id}
                          </p>
                        </div>
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
              ))}
            </div>
          )}
        </section>

        <footer className="mt-8 text-center text-sm text-slate-500">
          Sabor da Gente — Gerenciamento de pedidos
        </footer>
      </div>
    </main>
  );
}
