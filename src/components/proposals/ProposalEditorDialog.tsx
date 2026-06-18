import { useState, useEffect } from "react";
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

export type ProposalDraft = {
  title: string;
  client: string;
  clientEmail: string;
  introduction: string;
  scope: string;
  paymentTerms: string;
  validityDays: number;
  items: { description: string; quantity: number; unitPrice: number }[];
};

const empty: ProposalDraft = {
  title: "",
  client: "",
  clientEmail: "",
  introduction:
    "Olá, segue nossa proposta comercial conforme conversado. Estamos à disposição para esclarecer qualquer dúvida.",
  scope: "",
  paymentTerms: "50% na assinatura, 50% na entrega.",
  validityDays: 15,
  items: [{ description: "", quantity: 1, unitPrice: 0 }],
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (draft: ProposalDraft, action: "draft" | "send") => void;
  initial?: Partial<ProposalDraft>;
};

const ProposalEditorDialog = ({ open, onOpenChange, onSubmit, initial }: Props) => {
  const [draft, setDraft] = useState<ProposalDraft>(empty);

  useEffect(() => {
    if (open) setDraft({ ...empty, ...initial, items: initial?.items ?? empty.items });
  }, [open, initial]);

  const total = draft.items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);

  const updateItem = (idx: number, patch: Partial<ProposalDraft["items"][number]>) => {
    setDraft((d) => ({
      ...d,
      items: d.items.map((it, i) => (i === idx ? { ...it, ...patch } : it)),
    }));
  };

  const addItem = () =>
    setDraft((d) => ({ ...d, items: [...d.items, { description: "", quantity: 1, unitPrice: 0 }] }));

  const removeItem = (idx: number) =>
    setDraft((d) => ({ ...d, items: d.items.filter((_, i) => i !== idx) }));

  const canSubmit =
    draft.title.trim() && draft.client.trim() && draft.items.some((i) => i.description.trim());

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Proposta</DialogTitle>
          <DialogDescription>
            Preencha os dados da proposta. Você poderá salvar como rascunho ou enviar para o cliente.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-2">
          <div className="grid sm:grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label htmlFor="p-title">Título da proposta *</Label>
              <Input
                id="p-title"
                value={draft.title}
                onChange={(e) => setDraft({ ...draft, title: e.target.value })}
                placeholder="Ex.: Implementação SDR IA"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-client">Cliente *</Label>
              <Input
                id="p-client"
                value={draft.client}
                onChange={(e) => setDraft({ ...draft, client: e.target.value })}
                placeholder="Nome ou empresa"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-email">E-mail do cliente</Label>
              <Input
                id="p-email"
                type="email"
                value={draft.clientEmail}
                onChange={(e) => setDraft({ ...draft, clientEmail: e.target.value })}
                placeholder="contato@empresa.com"
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="p-validity">Validade (dias)</Label>
              <Input
                id="p-validity"
                type="number"
                min={1}
                value={draft.validityDays}
                onChange={(e) => setDraft({ ...draft, validityDays: Number(e.target.value) || 0 })}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-intro">Introdução</Label>
            <Textarea
              id="p-intro"
              rows={2}
              value={draft.introduction}
              onChange={(e) => setDraft({ ...draft, introduction: e.target.value })}
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-scope">Escopo / Descrição dos serviços</Label>
            <Textarea
              id="p-scope"
              rows={3}
              value={draft.scope}
              onChange={(e) => setDraft({ ...draft, scope: e.target.value })}
              placeholder="Descreva entregáveis, prazos e responsabilidades..."
            />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Itens *</Label>
              <Button type="button" variant="outline" size="sm" onClick={addItem}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Adicionar item
              </Button>
            </div>
            <Card>
              <CardContent className="p-3 space-y-2">
                {draft.items.map((item, idx) => (
                  <div key={idx} className="grid grid-cols-12 gap-2 items-start">
                    <Input
                      className="col-span-12 sm:col-span-6"
                      placeholder="Descrição do item"
                      value={item.description}
                      onChange={(e) => updateItem(idx, { description: e.target.value })}
                    />
                    <Input
                      className="col-span-4 sm:col-span-2"
                      type="number"
                      min={1}
                      placeholder="Qtd"
                      value={item.quantity}
                      onChange={(e) => updateItem(idx, { quantity: Number(e.target.value) || 0 })}
                    />
                    <Input
                      className="col-span-6 sm:col-span-3"
                      type="number"
                      min={0}
                      step="0.01"
                      placeholder="Valor unit."
                      value={item.unitPrice}
                      onChange={(e) => updateItem(idx, { unitPrice: Number(e.target.value) || 0 })}
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="col-span-2 sm:col-span-1 h-9 w-9 text-muted-foreground hover:text-destructive"
                      onClick={() => removeItem(idx)}
                      disabled={draft.items.length === 1}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex justify-end pt-2 border-t border-border">
                  <div className="text-sm">
                    <span className="text-muted-foreground mr-2">Total:</span>
                    <span className="font-bold text-foreground">
                      R$ {total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="p-payment">Condições de pagamento</Label>
            <Textarea
              id="p-payment"
              rows={2}
              value={draft.paymentTerms}
              onChange={(e) => setDraft({ ...draft, paymentTerms: e.target.value })}
            />
          </div>
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancelar
          </Button>
          <Button
            variant="secondary"
            disabled={!canSubmit}
            onClick={() => onSubmit(draft, "draft")}
          >
            Salvar rascunho
          </Button>
          <Button disabled={!canSubmit} onClick={() => onSubmit(draft, "send")}>
            Salvar e enviar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ProposalEditorDialog;
