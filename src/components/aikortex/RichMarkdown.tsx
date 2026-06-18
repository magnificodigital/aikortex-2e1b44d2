import ReactMarkdown, { Components } from "react-markdown";
import { getRehypePlugins } from "@/lib/safe-rehype";
import { ReactNode } from "react";

interface Props {
  children: string;
}

// Componentes ricos pra renderizar markdown do agente de forma agradável.
// Sobrepõe os defaults do react-markdown pra dar:
// - Listas numeradas como cards visuais com badge circular
// - Listas com bullets coloridos
// - Strong em destaque com cor primary
// - Headings com border-left + ícone implícito
// - hr com gradient
// - blockquote com bg + border-left
// - code inline com bg sutil
// - line-height generoso pra leitura
//
// Resultado: respostas longas com múltiplos itens viram cards organizados,
// não parágrafos densos.

const components: Components = {
  // ── Headings ──
  h1: ({ children }) => (
    <h1 className="text-base font-bold text-foreground mt-4 mb-2 pl-3 border-l-4 border-primary">
      {children}
    </h1>
  ),
  h2: ({ children }) => (
    <h2 className="text-sm font-bold text-foreground mt-3 mb-2 pl-2.5 border-l-[3px] border-primary/70">
      {children}
    </h2>
  ),
  h3: ({ children }) => (
    <h3 className="text-[13px] font-semibold text-foreground mt-3 mb-1.5 pl-2 border-l-2 border-primary/50">
      {children}
    </h3>
  ),

  // ── Paragraph ──
  p: ({ children }) => (
    <p className="text-sm leading-[1.65] text-foreground/90 mb-2.5 last:mb-0">
      {children}
    </p>
  ),

  // ── Strong / emphasis ──
  strong: ({ children }) => (
    <strong className="font-semibold text-foreground">
      {children}
    </strong>
  ),
  em: ({ children }) => (
    <em className="italic text-foreground/85">
      {children}
    </em>
  ),

  // ── Lists ──
  // Listas numeradas: cada item vira um "card" com badge circular do número.
  // O CSS list-decimal padrão é substituído por counter customizado.
  ol: ({ children }) => (
    <ol className="space-y-2.5 my-3 list-none [counter-reset:rich-counter]">
      {children}
    </ol>
  ),
  // Listas com bullets: bullet colorido em vez do disc preto
  ul: ({ children }) => (
    <ul className="space-y-1.5 my-2.5 list-none">
      {children}
    </ul>
  ),
  li: ({ children, ordered }: any) => {
    if (ordered) {
      return (
        <li className="relative pl-9 [counter-increment:rich-counter] before:content-[counter(rich-counter)] before:absolute before:left-0 before:top-0 before:w-7 before:h-7 before:rounded-full before:bg-gradient-to-br before:from-primary before:to-primary/70 before:text-primary-foreground before:font-bold before:text-xs before:flex before:items-center before:justify-center before:shadow-sm">
          <div className="rounded-lg bg-card/60 border border-border/60 px-3 py-2.5 -ml-1">
            {children}
          </div>
        </li>
      );
    }
    return (
      <li className="relative pl-5 before:content-[''] before:absolute before:left-1 before:top-[10px] before:w-1.5 before:h-1.5 before:rounded-full before:bg-primary/60">
        {children}
      </li>
    );
  },

  // ── Code ──
  code: ({ inline, className, children }: any) => {
    if (inline) {
      return (
        <code className="px-1.5 py-0.5 rounded-md bg-muted text-foreground text-[12px] font-mono border border-border/40">
          {children}
        </code>
      );
    }
    return (
      <pre className="my-3 p-3 rounded-lg bg-muted/60 border border-border overflow-x-auto">
        <code className={`text-xs font-mono text-foreground ${className || ""}`}>
          {children}
        </code>
      </pre>
    );
  },

  // ── Block divider ──
  hr: () => (
    <hr className="my-4 border-0 h-px bg-gradient-to-r from-transparent via-border to-transparent" />
  ),

  // ── Blockquote ──
  blockquote: ({ children }) => (
    <blockquote className="my-3 pl-3 py-2 border-l-2 border-primary/40 bg-primary/5 rounded-r-md text-foreground/85 italic">
      {children}
    </blockquote>
  ),

  // ── Link ──
  a: ({ href, children }) => (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="text-primary hover:text-primary/80 underline underline-offset-2 decoration-primary/40 hover:decoration-primary transition-colors"
    >
      {children}
    </a>
  ),
};

const RichMarkdown = ({ children }: Props) => (
  <ReactMarkdown rehypePlugins={getRehypePlugins()} components={components}>
    {children}
  </ReactMarkdown>
);

export default RichMarkdown;
