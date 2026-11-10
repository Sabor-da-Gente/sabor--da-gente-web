"use client";

import { useEffect, useMemo, useState, useCallback } from "react";
import Link from "next/link";
import { supabase } from "@/lib/supabase";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

type Pedido = {
  id: string;
  total: number;
  status: string;
  forma_pagamento: string;
  criado_em: string;
};

const CORES_PIE = ["#f97316", "#38bdf8", "#a855f7", "#22c55e", "#eab308"];

export default function DashboardPage() {
  const [pedidos, setPedidos] = useState<Pedido[]>([]);
  const [carregando, setCarregando] = useState(true);

  const carregarDados = useCallback(async () => {
    const { data } = await supabase
      .from("pedidos")
      .select("id, total, status, forma_pagamento, criado_em")
      .order("criado_em", { ascending: true });

    setPedidos((data as Pedido[]) || []);
    setCarregando(false);
  }, []);

  useEffect(() => {
    void carregarDados();

    // Inscrição em tempo real no Supabase
    const canal = supabase
      .channel("realtime-dashboard")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "pedidos" },
        () => {
          void carregarDados();
        }
      )
      .subscribe();

    return () => {
      void supabase.removeChannel(canal);
    };
  }, [carregarDados]);

  // Cálculos de Relatórios
  const pedidosValidos = useMemo(
    () => pedidos.filter((p) => p.status !== "cancelado"),
    [pedidos]
  );

  const faturamentoTotal = useMemo(
    () => pedidosValidos.reduce((acc, p) => acc + (p.total || 0), 0) / 100,
    [pedidosValidos]
  );

  const ticketMedio = useMemo(() => {
    if (pedidosValidos.length === 0) return 0;
    return faturamentoTotal / pedidosValidos.length;
  }, [pedidosValidos, faturamentoTotal]);

  const pedidosEmAberto = useMemo(
    () =>
      pedidos.filter((p) =>
        ["recebido", "em_preparo", "saiu_para_entrega", "pronto_para_retirada"].includes(
          p.status
        )
      ).length,
    [pedidos]
  );

  // Gráfico: Formas de Pagamento
  const dadosPagamento = useMemo(() => {
    const contagem: Record<string, number> = {};
    pedidosValidos.forEach((p) => {
      const forma = (p.forma_pagamento || "Outro").toUpperCase();
      contagem[forma] = (contagem[forma] || 0) + 1;
    });
    return Object.entries(contagem).map(([name, value]) => ({ name, value }));
  }, [pedidosValidos]);

  // Gráfico: Vendas agrupadas por Data
  const dadosVendasPorData = useMemo(() => {
    const faturamentoDia: Record<string, number> = {};
    pedidosValidos.forEach((p) => {
      const dataStr = new Date(p.criado_em).toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
      });
      faturamentoDia[dataStr] =
        (faturamentoDia[dataStr] || 0) + (p.total || 0) / 100;
    });

    return Object.entries(faturamentoDia).map(([data, total]) => ({
      data,
      total: Number(total.toFixed(2)),
    }));
  }, [pedidosValidos]);

  return (
    <main className="min-h-screen bg-slate-950 p-6 text-white md:p-10">
      <div className="mx-auto max-w-7xl">
        <header className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <Link
              href="/"
              className="text-sm font-medium text-orange-400 hover:text-orange-300"
            >
              ← Voltar ao início
            </Link>
            <h1 className="mt-1 text-3xl font-bold tracking-tight">
              Dashboard de Vendas & Relatórios 📊
            </h1>
            <p className="mt-1 text-slate-400">
              Acompanhamento em tempo real das métricas da pizzaria.
            </p>
          </div>

          <div className="flex items-center gap-2 rounded-full border border-emerald-800 bg-emerald-950/60 px-4 py-2 text-xs font-semibold text-emerald-400">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500 animate-pulse" />
            Tempo Real Ativo
          </div>
        </header>

        {/* Métricas Principais (KPIs) */}
        <section className="mb-8 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm font-medium text-slate-400">Faturamento Válido</p>
            <p className="mt-2 text-3xl font-bold text-orange-400">
              {faturamentoTotal.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm font-medium text-slate-400">Total de Pedidos</p>
            <p className="mt-2 text-3xl font-bold text-white">{pedidos.length}</p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm font-medium text-slate-400">Ticket Médio</p>
            <p className="mt-2 text-3xl font-bold text-sky-400">
              {ticketMedio.toLocaleString("pt-BR", {
                style: "currency",
                currency: "BRL",
              })}
            </p>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900 p-5">
            <p className="text-sm font-medium text-slate-400">Em Atendimento</p>
            <p className="mt-2 text-3xl font-bold text-amber-400">
              {pedidosEmAberto}
            </p>
          </div>
        </section>

        {/* Gráficos */}
        {carregando ? (
          <div className="py-20 text-center text-slate-400">
            Carregando gráficos...
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Gráfico 1: Vendas por Data */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-bold text-slate-200">
                Faturamento por Data (R$)
              </h2>
              <p className="mb-4 text-xs text-slate-400">
                Histórico consolidado de pedidos não cancelados
              </p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={dadosVendasPorData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="data" stroke="#94a3b8" />
                    <YAxis stroke="#94a3b8" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        borderColor: "#334155",
                        borderRadius: "0.75rem",
                      }}
                      formatter={(valor: any) => [
                        `R$ ${Number(valor || 0).toFixed(2)}`,
                        "Faturamento",
                      ]}
                    />
                    <Bar dataKey="total" fill="#f97316" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Gráfico 2: Formas de Pagamento */}
            <div className="rounded-2xl border border-slate-800 bg-slate-900 p-6">
              <h2 className="text-lg font-bold text-slate-200">
                Distribuição de Pagamentos
              </h2>
              <p className="mb-4 text-xs text-slate-400">
                Preferência dos clientes por forma de pagamento
              </p>
              <div className="h-72 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={dadosPagamento}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={90}
                      label={({ name, percent }: any) =>
                        `${name ?? "Outro"} (${(((percent ?? 0) * 100)).toFixed(0)}%)`
                      }
                    >
                      {dadosPagamento.map((_, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={CORES_PIE[index % CORES_PIE.length]}
                        />
                      ))}
                    </Pie>
                    <Tooltip
                      contentStyle={{
                        backgroundColor: "#020617",
                        borderColor: "#334155",
                        borderRadius: "0.75rem",
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}