import { Link, useRouter } from "@tanstack/react-router";
import { ChevronDown, LogOut, UserRound } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/hooks/useAuth";
import { StudentAvatar } from "@/components/StudentAvatar";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuTrigger, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator } from "@/components/ui/dropdown-menu";

export function AccountMenu() {
  const { user, perfil, loading, sair } = useAuth();
  const router = useRouter();
  if (loading && !user) return <div className="size-10 animate-pulse rounded-full bg-muted" aria-label="Carregando conta" />;
  if (!user) return <Button asChild size="sm"><Link to="/auth">Entrar</Link></Button>;
  return <DropdownMenu>
    <DropdownMenuTrigger asChild>
      <Button variant="ghost" className="h-12 gap-2 px-2" aria-label="Menu da minha conta">
        <StudentAvatar value={perfil?.avatar} portrait className="size-9! rounded-full bg-secondary" />
        <span className="hidden max-w-36 truncate sm:block">{perfil?.nome || "Minha conta"}</span>
        <ChevronDown className="size-4 text-muted-foreground" />
      </Button>
    </DropdownMenuTrigger>
    <DropdownMenuContent align="end" className="w-56">
      <DropdownMenuLabel className="truncate">{perfil?.nome || "Minha conta"}</DropdownMenuLabel>
      <DropdownMenuSeparator />
      <DropdownMenuItem asChild><Link to="/perfil"><UserRound />Meu perfil</Link></DropdownMenuItem>
      <DropdownMenuSeparator />
      <DropdownMenuItem className="text-destructive focus:text-destructive" onSelect={() => { void (async () => { try { await sair(); await router.navigate({ to: "/" }); } catch { toast.error("Não foi possível sair. Tente novamente."); } })(); }}><LogOut />Sair</DropdownMenuItem>
    </DropdownMenuContent>
  </DropdownMenu>;
}