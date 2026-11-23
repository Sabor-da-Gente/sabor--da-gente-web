"use client";

import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function ProtegerRota({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [liberado, setLiberado] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function verificar() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        if (ativo) router.replace("/login");
        return;
      }

      const { data: ehAdmin, error } = await supabase.rpc("eh_admin");
      if (!ativo) return;

      if (error) {
        router.replace("/login?erro=verificacao");
        return;
      }
      if (ehAdmin !== true) {
        await supabase.auth.signOut();
        router.replace("/login?erro=sem-permissao");
        return;
      }
      setLiberado(true);
    }

    void verificar();

    const { data: inscricao } = supabase.auth.onAuthStateChange((evento) => {
      if (evento === "SIGNED_OUT") {
        setLiberado(false);
        router.replace("/login");
      }
    });

    return () => {
      ativo = false;
      inscricao.subscription.unsubscribe();
    };
  }, [router]);

  if (!liberado) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-zinc-950 text-zinc-400">
        <p role="status">Verificando acesso...</p>
      </main>
    );
  }

  return <>{children}</>;
}
