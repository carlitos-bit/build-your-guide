import { Link, useRouter } from "@tanstack/react-router";
import {
  BookOpenCheck,
  CalendarClock,
  GraduationCap,
  LayoutDashboard,
  Library,
  LogOut,
  PenLine,
  ShieldCheck,
  Trophy,
} from "lucide-react";
import type { ReactNode } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { AccountMenu } from "@/components/AccountMenu";
import { StudentAvatar } from "@/components/StudentAvatar";

const itensAluno = [
  { to: "/painel", label: "Painel", icon: LayoutDashboard },
  { to: "/nova-redacao", label: "Nova redação", icon: PenLine },
  { to: "/redacoes", label: "Minhas redações", icon: BookOpenCheck },
  { to: "/perfil", label: "Meu perfil", icon: Trophy },
  { to: "/eventos", label: "Eventos", icon: CalendarClock },
  { to: "/biblioteca", label: "Conhecimentos", icon: Library },
] as const;

export function AppShell({
  children,
  titulo,
  descricao,
}: {
  children: ReactNode;
  titulo: string;
  descricao?: string | undefined;
}) {
  const { perfil, isProfessor, isAdmin, sair } = useAuth();
  const router = useRouter();

  async function handleSair() {
    await sair();
    void router.navigate({ to: "/" });
  }

  return (
    <div className="min-h-screen bg-background">
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col bg-sidebar px-4 py-6 text-sidebar-foreground lg:flex">
        <Link to="/" className="mb-8 flex items-center gap-2 px-2">
          <span className="grid size-9 place-items-center rounded-xl bg-brand font-display text-lg font-bold text-primary-foreground">
            E
          </span>
          <span className="font-display text-lg font-semibold">EscreveAI</span>
        </Link>

        <nav className="flex flex-1 flex-col gap-1">
          {(isProfessor ? [] : itensAluno).map(({ to, label, icon: Icon }) => (
            <Link
              key={to}
              to={to}
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className:
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold bg-sidebar-primary text-sidebar-primary-foreground",
              }}
            >
              <Icon className="size-4" />
              {label}
            </Link>
          ))}

          {isProfessor && (
            <>
              <p className="mt-6 px-3 text-xs font-semibold uppercase tracking-wider text-sidebar-foreground/50">
                Professor
              </p>
              <Link
                to="/professor"
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                activeProps={{
                  className:
                    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold bg-sidebar-primary text-sidebar-primary-foreground",
                }}
              >
                <GraduationCap className="size-4" />
                Painel do professor
              </Link>
            </>
          )}

          {isAdmin && (
            <Link
              to="/admin"
              className="flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-sidebar-foreground/80 transition-colors hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
              activeProps={{
                className:
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-semibold bg-sidebar-primary text-sidebar-primary-foreground",
              }}
            >
              <ShieldCheck className="size-4" />
              Administração
            </Link>
          )}
        </nav>

        <div className="mt-4 rounded-xl bg-sidebar-accent p-3">
          {!isProfessor && <StudentAvatar value={perfil?.avatar} portrait className="mb-2 size-11 rounded-full bg-secondary" />}
          <p className="truncate text-sm font-semibold">{perfil?.nome ?? "Aluno"}</p>
          <p className="truncate text-xs text-sidebar-foreground/60">
            {isAdmin ? "Administrador" : isProfessor ? "Professor" : "Aluno"}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleSair}
            className="mt-2 w-full justify-start px-2 text-sidebar-foreground/80 hover:bg-sidebar/60 hover:text-sidebar-foreground"
          >
            <LogOut className="size-4" /> Sair
          </Button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex flex-wrap items-center justify-between gap-3 border-b border-border bg-background/85 px-5 py-4 backdrop-blur">
          <div>
            <h1 className="font-display text-xl font-semibold">{titulo}</h1>
            {descricao && <p className="text-sm text-muted-foreground">{descricao}</p>}
          </div>
          <div className="flex items-center gap-2">{!isProfessor && <Button asChild size="sm">
            <Link to="/nova-redacao">
              <PenLine className="size-4" /> Escrever
            </Link>
          </Button>}
          <AccountMenu /></div>
        </header>

        <nav className="flex gap-1 overflow-x-auto border-b border-border bg-card px-3 py-2 lg:hidden">
          {(isProfessor ? [] : itensAluno).map(({ to, label }) => (
            <Link
              key={to}
              to={to}
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
              activeProps={{
                className:
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground",
              }}
            >
              {label}
            </Link>
          ))}
          {isProfessor && (
            <Link
              to="/professor"
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
              activeProps={{
                className:
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground",
              }}
            >
              Professor
            </Link>
          )}
          {isAdmin && (
            <Link
              to="/admin"
              className="whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-medium text-muted-foreground"
              activeProps={{
                className:
                  "whitespace-nowrap rounded-full px-3 py-1.5 text-xs font-semibold bg-primary text-primary-foreground",
              }}
            >
              Admin
            </Link>
          )}
        </nav>

        <main className="mx-auto w-full max-w-6xl px-5 py-6">{children}</main>
      </div>
    </div>
  );
}
