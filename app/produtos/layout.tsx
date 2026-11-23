import type { ReactNode } from "react";
import ProtegerRota from "@/components/ProtegerRota";

export default function Layout({ children }: { children: ReactNode }) {
  return <ProtegerRota>{children}</ProtegerRota>;
}
