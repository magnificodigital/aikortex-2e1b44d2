import { useEffect, useMemo, useState } from "react";
import { CheckCheck, Phone, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { fnUrl } from "@/lib/supabase-url";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type Category = "MARKETING" | "UTILITY" | "AUTHENTICATION";

const LANGUAGES: { code: string; label: string }[] = [
  { code: "pt_BR", label: "Português (Brasil)" },
  { code: "en_US", label: "English (US)" },
  { code: "es", label: "Español" },
  { code: "es_AR", label: "Español (Argentina)" },
  { code: "es_MX", label: "Español (México)" },
  { code: "fr", label: "Français" },
  { code: "it", label: "Italiano" },
  { code: "de", label: "Deutsch" },
];

type ButtonItem =
  | { type: "QUICK_REPLY"; text: string }
  | { type: "URL"; text: string; url: string }
  | { type: "PHONE_NUMBER"; text: string; phone: string };

function extractVarCount(body: string): number {
  const matches = body.match(/\{\{\d+\}\}/g) ?? [];
  return new Set(matches.map((m) => parseInt(m.replace(/[{}]/g, ""), 10))).size;
}

function substituteVars(text: string, examples: string[]): string {
  return text.replace(/\{\{(\d+)\}\}/g, (_, idx) => {
    const i = parseInt(idx, 10) - 1;
    return examples[i] || `{{${idx}}}`;
  });
}

export default function WhatsAppTemplateCreatorDialog({ open, onOpenChange }: Props) {
  const qc = useQueryClient();
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("UTILITY");
  const [language, setLanguage] = useState("pt_BR");

  const [body, setBody] = useState("");
  const [examples, setExamples] = useState<string[]>([]);

  const [headerEnabled, setHeaderEnabled] = useState(false);
  const [headerText, setHeaderText] = useState("");

  const [footerEnabled, setFooterEnabled] = useState(false);
  const [footerText, setFooterText] = useState("");

  const [buttons, setButtons] = useState<ButtonItem[]>([]);
  const [saving, setSaving] = useState(false);

  // Reset state quando o dialog abre
  useEffect(() => {
    if (open) {
      setName("");
      setCategory("UTILITY");
      setLanguage("pt_BR");
      setBody("");
      setExamples([]);
      setHeaderEnabled(false);
      setHeaderText("");
      setFooterEnabled(false);
      setFooterText("");
      setButtons([]);
    }
  }, [open]);

  // Sincroniza tamanho do array de exemplos com número de variáveis no body
  const varCount = useMemo(() => extractVarCount(body), [body]);
  useEffect(() => {
    setExamples((prev) => {
      const next = [...prev];
      while (next.length < varCount) next.push("");
      while (next.length > varCount) next.pop();
      return next;
    });
  }, [varCount]);

  const insertPlaceholder = () => {
    const nextIdx = varCount + 1;
    setBody((prev) => `${prev}{{${nextIdx}}}`);
  };

  const isValid =
    /^[a-z0-9_]{1,512}$/.test(name) &&
    body.trim().length > 0 &&
    body.length <= 1024 &&
    (!headerEnabled || headerText.trim().length > 0) &&
    (!footerEnabled || footerText.trim().length > 0) &&
    examples.every((ex) => ex.trim().length > 0) &&
    buttons.every((b) => {
      if (b.type === "QUICK_REPLY") return b.text.trim().length > 0;
      if (b.type === "URL") return b.text.trim() && /^https?:\/\//.test(b.url);
      if (b.type === "PHONE_NUMBER") return b.text.trim() && /^\+?\d{8,}$/.test(b.phone);
      return false;
    });

  const onSubmit = async () => {
    if (!isValid) {
      toast.error("Confira os campos: nome, body, exemplos e botões precisam estar completos");
      return;
    }
    setSaving(true);
    try {
      const components: any[] = [];
      if (headerEnabled && headerText.trim()) {
        components.push({ type: "HEADER", format: "TEXT", text: headerText.trim() });
      }
      const bodyComp: any = { type: "BODY", text: body.trim() };
      if (examples.length > 0) {
        bodyComp.example = { body_text: [examples] };
      }
      components.push(bodyComp);
      if (footerEnabled && footerText.trim()) {
        components.push({ type: "FOOTER", text: footerText.trim() });
      }
      if (buttons.length > 0) {
        components.push({
          type: "BUTTONS",
          buttons: buttons.map((b) => {
            if (b.type === "QUICK_REPLY") return { type: "QUICK_REPLY", text: b.text.trim() };
            if (b.type === "URL") return { type: "URL", text: b.text.trim(), url: b.url.trim() };
            return { type: "PHONE_NUMBER", text: b.text.trim(), phone_number: b.phone.trim() };
          }),
        });
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Não autenticado");
      const url = `${fnUrl("whatsapp-templates")}?action=create`;
      const resp = await fetch(url, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${session.access_token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: name.trim(), category, language, components }),
      });
      const json = await resp.json();
      if (!resp.ok) {
        const err = json?.details?.error?.message || json?.error || `Falha (${resp.status})`;
        throw new Error(err);
      }
      toast.success("Template enviado para aprovação Meta (aprovação em 1-24h)");
      qc.invalidateQueries({ queryKey: ["whatsapp-templates"] });
      onOpenChange(false);
    } catch (e) {
      toast.error(`Erro: ${(e as Error).message}`);
    } finally {
      setSaving(false);
    }
  };

  const addButton = (type: ButtonItem["type"]) => {
    if (buttons.length >= 3) {
      toast.error("Máximo 3 botões por template");
      return;
    }
    if (type === "QUICK_REPLY") setButtons((b) => [...b, { type, text: "" }]);
    if (type === "URL") setButtons((b) => [...b, { type, text: "", url: "" }]);
    if (type === "PHONE_NUMBER") setButtons((b) => [...b, { type, text: "", phone: "" }]);
  };

  // Preview substituído
  const previewBody = useMemo(() => substituteVars(body, examples), [body, examples]);
  const previewHeader = useMemo(() => (headerEnabled ? substituteVars(headerText, examples) : ""), [headerEnabled, headerText, examples]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl max-h-[92vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="text-base">Criar template WhatsApp</DialogTitle>
          <DialogDescription className="text-xs">
            Submete pra aprovação Meta. Templates de Marketing levam mais tempo (~24h); Utility geralmente aprovam em 1h.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto -mx-6 px-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 py-2">
            {/* ── COLUNA 1: form ── */}
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label className="text-xs">Nome *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))}
                    placeholder="ex: lembrete_consulta"
                    maxLength={512}
                    className="font-mono text-xs"
                  />
                  <p className="text-[10px] text-muted-foreground">Lowercase, dígitos e underscore.</p>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Categoria *</Label>
                  <Select value={category} onValueChange={(v) => setCategory(v as Category)}>
                    <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="UTILITY">Utility (transacional, lembretes, OTP)</SelectItem>
                      <SelectItem value="MARKETING">Marketing (promoções, campanhas)</SelectItem>
                      <SelectItem value="AUTHENTICATION">Authentication (códigos de login)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs">Idioma *</Label>
                <Select value={language} onValueChange={setLanguage}>
                  <SelectTrigger className="h-9 text-xs"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {LANGUAGES.map((l) => (
                      <SelectItem key={l.code} value={l.code}>{l.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* HEADER */}
              <div className="rounded-md border border-border p-3 space-y-2">
                <label className="flex items-center justify-between text-xs">
                  <span className="font-semibold">Cabeçalho (opcional)</span>
                  <input type="checkbox" checked={headerEnabled} onChange={(e) => setHeaderEnabled(e.target.checked)} />
                </label>
                {headerEnabled && (
                  <div className="space-y-1">
                    <Input
                      value={headerText}
                      onChange={(e) => setHeaderText(e.target.value)}
                      placeholder="Ex: Lembrete da Clínica X"
                      maxLength={60}
                      className="text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">Até 60 caracteres. Pode usar {`{{N}}`}.</p>
                  </div>
                )}
              </div>

              {/* BODY */}
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <Label className="text-xs">Corpo da mensagem *</Label>
                  <Button type="button" variant="ghost" size="sm" className="h-6 text-[10px] gap-1" onClick={insertPlaceholder}>
                    <Plus className="w-3 h-3" /> {`{{${varCount + 1}}}`}
                  </Button>
                </div>
                <Textarea
                  value={body}
                  onChange={(e) => setBody(e.target.value)}
                  placeholder="Olá {{1}}, sua consulta é amanhã às {{2}}. Confirme sua presença."
                  rows={4}
                  maxLength={1024}
                  className="text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Até 1024 caracteres. Use <code className="px-1 py-px rounded bg-muted/60">{`{{1}}`}</code>,{" "}
                  <code className="px-1 py-px rounded bg-muted/60">{`{{2}}`}</code>… para variáveis dinâmicas.
                </p>
              </div>

              {/* EXAMPLES — Meta exige */}
              {varCount > 0 && (
                <div className="rounded-md border border-amber-500/30 bg-amber-500/5 p-3 space-y-2">
                  <p className="text-[10px] uppercase tracking-wider text-amber-600 font-semibold">
                    Exemplos de variáveis (obrigatórios)
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    Meta usa esses exemplos pra revisar o template. Use valores reais e plausíveis.
                  </p>
                  {Array.from({ length: varCount }).map((_, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <span className="text-[10px] font-mono text-muted-foreground w-8">{`{{${i + 1}}}`}</span>
                      <Input
                        value={examples[i] ?? ""}
                        onChange={(e) => {
                          const next = [...examples];
                          next[i] = e.target.value;
                          setExamples(next);
                        }}
                        placeholder={`Ex: ${i === 0 ? "Maria Silva" : "14:30"}`}
                        className="text-xs h-8"
                      />
                    </div>
                  ))}
                </div>
              )}

              {/* FOOTER */}
              <div className="rounded-md border border-border p-3 space-y-2">
                <label className="flex items-center justify-between text-xs">
                  <span className="font-semibold">Rodapé (opcional)</span>
                  <input type="checkbox" checked={footerEnabled} onChange={(e) => setFooterEnabled(e.target.checked)} />
                </label>
                {footerEnabled && (
                  <div className="space-y-1">
                    <Input
                      value={footerText}
                      onChange={(e) => setFooterText(e.target.value)}
                      placeholder="Não responda este número"
                      maxLength={60}
                      className="text-xs"
                    />
                    <p className="text-[10px] text-muted-foreground">Até 60 caracteres. Sem variáveis.</p>
                  </div>
                )}
              </div>

              {/* BUTTONS */}
              <div className="rounded-md border border-border p-3 space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold">Botões (opcional, máximo 3)</p>
                  <div className="flex gap-1">
                    <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => addButton("QUICK_REPLY")}>+ Quick</Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => addButton("URL")}>+ URL</Button>
                    <Button type="button" variant="outline" size="sm" className="h-7 text-[10px]" onClick={() => addButton("PHONE_NUMBER")}>+ Telefone</Button>
                  </div>
                </div>
                {buttons.map((b, i) => (
                  <div key={i} className="flex gap-2 items-start border-t border-border/50 pt-2 first:border-t-0 first:pt-0">
                    <Badge variant="outline" className="text-[9px] shrink-0 mt-1">
                      {b.type === "QUICK_REPLY" ? "QUICK" : b.type === "URL" ? "URL" : "TEL"}
                    </Badge>
                    <div className="flex-1 space-y-1">
                      <Input
                        value={b.text}
                        onChange={(e) => {
                          const next = [...buttons];
                          (next[i] as any).text = e.target.value;
                          setButtons(next);
                        }}
                        placeholder="Texto do botão"
                        maxLength={25}
                        className="h-7 text-xs"
                      />
                      {b.type === "URL" && (
                        <Input
                          value={b.url}
                          onChange={(e) => {
                            const next = [...buttons];
                            (next[i] as any).url = e.target.value;
                            setButtons(next);
                          }}
                          placeholder="https://exemplo.com"
                          className="h-7 text-xs font-mono"
                        />
                      )}
                      {b.type === "PHONE_NUMBER" && (
                        <Input
                          value={b.phone}
                          onChange={(e) => {
                            const next = [...buttons];
                            (next[i] as any).phone = e.target.value;
                            setButtons(next);
                          }}
                          placeholder="+5511999999999"
                          className="h-7 text-xs font-mono"
                        />
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => setButtons((bs) => bs.filter((_, idx) => idx !== i))}
                    >
                      <Trash2 className="w-3 h-3 text-destructive" />
                    </Button>
                  </div>
                ))}
                {buttons.length === 0 && (
                  <p className="text-[10px] text-muted-foreground text-center py-2">Nenhum botão adicionado.</p>
                )}
              </div>
            </div>

            {/* ── COLUNA 2: preview ── */}
            <div className="space-y-3 md:sticky md:top-0">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">Preview no WhatsApp</p>
              <div className="rounded-lg p-4 bg-gradient-to-br from-emerald-900/20 to-emerald-950/40 min-h-[300px]">
                <div className="max-w-[280px] mx-auto rounded-lg bg-[#202c33] p-3 shadow-lg">
                  {previewHeader && (
                    <p className="text-[13px] font-bold text-white mb-1.5">{previewHeader}</p>
                  )}
                  {previewBody ? (
                    <p className="text-[13px] text-white/95 whitespace-pre-wrap leading-relaxed">{previewBody}</p>
                  ) : (
                    <p className="text-[13px] text-white/30 italic">Escreva o corpo da mensagem…</p>
                  )}
                  {footerEnabled && footerText.trim() && (
                    <p className="text-[10px] text-white/40 mt-2">{footerText}</p>
                  )}
                  <div className="flex items-center justify-end gap-1 mt-1.5">
                    <span className="text-[9px] text-white/40">12:34</span>
                    <CheckCheck className="w-3 h-3 text-[#53bdeb]" />
                  </div>
                </div>
                {buttons.length > 0 && (
                  <div className="max-w-[280px] mx-auto mt-1 space-y-0.5">
                    {buttons.map((b, i) => (
                      <button
                        key={i}
                        type="button"
                        disabled
                        className="w-full rounded-md bg-[#202c33] py-2 text-[12px] text-[#53bdeb] font-medium flex items-center justify-center gap-1.5"
                      >
                        {b.type === "PHONE_NUMBER" && <Phone className="w-3 h-3" />}
                        {b.text || "Botão"}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              <div className="rounded-md border border-border p-2.5 space-y-1 text-[11px] text-muted-foreground">
                <p className="font-semibold text-foreground">📝 Dicas pra aprovação Meta</p>
                <ul className="list-disc list-inside space-y-0.5">
                  <li>Marketing genérico ("Promoção imperdível!") é rejeitado. Seja específico.</li>
                  <li>Não force urgência ("Última chance!"). Meta penaliza.</li>
                  <li>Variáveis precisam ter exemplos plausíveis (não "Lorem ipsum").</li>
                  <li>Categoria certa importa: cobrança/lembrete = Utility, não Marketing.</li>
                </ul>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="border-t border-border pt-3">
          <Button variant="ghost" onClick={() => onOpenChange(false)} disabled={saving}>Cancelar</Button>
          <Button onClick={onSubmit} disabled={saving || !isValid}>
            {saving ? "Enviando..." : "Enviar para aprovação Meta"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
