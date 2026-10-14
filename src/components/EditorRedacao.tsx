import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Check, Loader2, ShieldAlert } from "lucide-react";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

/**
 * Editor de redação com foco na produção autoral.
 *
 * - Bloqueia colagem (Ctrl+V / Cmd+V / menu de contexto) e arrastar-e-soltar texto.
 * - Contador de palavras, caracteres e linhas.
 * - Salvamento automático do rascunho no navegador, com indicador visual.
 * - Recupera o rascunho ao reabrir a página.
 * - Avisa antes de sair/atualizar com texto não enviado.
 *
 * A proteção roda no navegador e inibe os métodos controláveis por ele; não é
 * uma garantia absoluta contra plágio (captura de tela, outro dispositivo etc.).
 */

const chaveRascunho = (base: string) => `escreveai:rascunho:${base}`;

export function limparRascunho(base: string) {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(chaveRascunho(base));
  } catch {
    /* armazenamento indisponível — ignora */
  }
}

type EditorRedacaoProps = {
  value: string;
  onChange: (valor: string) => void;
  rascunhoBase: string;
  id?: string;
  placeholder?: string;
  className?: string;
  autoFocus?: boolean;
  /** Estimativa de limite de linhas, só para aviso visual. */
  maxLinhas?: number;
};

export function EditorRedacao({
  value,
  onChange,
  rascunhoBase,
  id,
  placeholder,
  className,
  autoFocus,
  maxLinhas,
}: EditorRedacaoProps) {
  const montado = useRef(false);
  const valorAoMontar = useRef(value);
  const [status, setStatus] = useState<"idle" | "salvando" | "salvo">("idle");
  const [salvoEm, setSalvoEm] = useState<Date | null>(null);
  const [bloqueios, setBloqueios] = useState(0);

  // Recupera o rascunho salvo no navegador (uma vez, ao montar).
  useEffect(() => {
    if (montado.current) return;
    montado.current = true;
    if (typeof window === "undefined") return;
    try {
      const salvo = window.localStorage.getItem(chaveRascunho(rascunhoBase));
      if (salvo && salvo !== valorAoMontar.current && salvo.trim().length > 0) {
        onChange(salvo);
        toast.info("Recuperamos o rascunho que você ainda não enviou.");
      }
    } catch {
      /* ignora */
    }
  }, [onChange, rascunhoBase]);

  // Salvamento automático (com atraso curto para não gravar a cada tecla).
  useEffect(() => {
    if (typeof window === "undefined" || !montado.current) return;
    if (value.trim().length === 0) {
      try {
        window.localStorage.removeItem(chaveRascunho(rascunhoBase));
      } catch {
        /* ignora */
      }
      setStatus("idle");
      return;
    }
    setStatus("salvando");
    const timer = window.setTimeout(() => {
      try {
        window.localStorage.setItem(chaveRascunho(rascunhoBase), value);
        setStatus("salvo");
        setSalvoEm(new Date());
      } catch {
        setStatus("idle");
      }
    }, 800);
    return () => window.clearTimeout(timer);
  }, [value, rascunhoBase]);

  // Aviso ao fechar/atualizar com texto não enviado.
  useEffect(() => {
    if (typeof window === "undefined") return;
    const aoSair = (evento: BeforeUnloadEvent) => {
      if (value.trim().length > 0) {
        evento.preventDefault();
        evento.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", aoSair);
    return () => window.removeEventListener("beforeunload", aoSair);
  }, [value]);

  function bloquearColagem(evento: React.SyntheticEvent) {
    evento.preventDefault();
    setBloqueios((n) => n + 1);
    toast.warning("Colar está desativado: escreva sua redação diretamente no editor.");
  }

  const palavras = value.trim() ? value.trim().split(/\s+/).length : 0;
  const linhasManuais = value.length ? value.split(/\n/).length : 1;
  const linhasEstimadas = Math.max(linhasManuais, Math.ceil(value.length / 75));
  const excedeuLinhas = maxLinhas ? linhasEstimadas > maxLinhas : false;

  return (
    <div>
      <Textarea
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onPaste={bloquearColagem}
        onDrop={bloquearColagem}
        onDragOver={(e) => e.preventDefault()}
        placeholder={placeholder}
        className={className}
        autoFocus={autoFocus}
        spellCheck
      />

      <div className="mt-3 flex flex-wrap items-center justify-between gap-x-4 gap-y-2 text-xs text-muted-foreground">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          <span>{palavras} palavras</span>
          <span>{value.length} caracteres</span>
          <span className={cn(excedeuLinhas && "font-semibold text-danger")}>
            ~{linhasEstimadas} linhas{maxLinhas ? ` (ideal até ${maxLinhas})` : ""}
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
          {bloqueios > 0 && (
            <span className="inline-flex items-center gap-1 text-warning">
              <ShieldAlert className="size-3.5" />
              {bloqueios} colagem{bloqueios > 1 ? "ns" : ""} bloqueada{bloqueios > 1 ? "s" : ""}
            </span>
          )}
          <span className="inline-flex items-center gap-1">
            {status === "salvando" ? (
              <>
                <Loader2 className="size-3.5 animate-spin" /> salvando rascunho…
              </>
            ) : status === "salvo" ? (
              <>
                <Check className="size-3.5 text-success" />
                rascunho salvo
                {salvoEm
                  ? ` às ${salvoEm.toLocaleTimeString("pt-BR", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}`
                  : ""}
              </>
            ) : (
              <>salvamento automático ativo</>
            )}
          </span>
        </div>
      </div>
    </div>
  );
}
