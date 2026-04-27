import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import {
  Plus,
  Edit,
  Trash2,
  Wand2,
  Search,
  RefreshCw,
  ArrowRight,
} from "lucide-react";

export interface AssetOverride {
  id: string;
  cliente: string;
  instituicao: string;
  ativo_original: string;
  ativo_novo: string | null;
  classe_ativo: string | null;
  emissor: string | null;
  taxa: string | null;
  vencimento: string | null;
  liquidez: string | null;
  ativo: boolean;
  observacao: string | null;
  created_at: string;
  updated_at: string;
}

interface AssetOverridesTabProps {
  clientName: string;
  classesAtivo: string[];
  instituicoes: string[];
  ativosOriginais: string[]; // ativos vistos para esse cliente, para autocomplete
  /** Quando muda, o componente recarrega as regras (útil após salvar do modal externo) */
  refreshSignal?: number;
  /** Quando o nonce muda, abre o dialog de criação pré-preenchido com os campos abaixo. */
  prefillRequest?: {
    nonce: number;
    instituicao: string;
    ativo_original: string;
    classe_ativo?: string;
    emissor?: string;
    taxa?: string;
    vencimento?: string;
    liquidez?: string;
  };
}

type FormState = {
  id?: string;
  cliente: string;
  instituicao: string;
  ativo_original: string;
  ativo_novo: string;
  classe_ativo: string;
  emissor: string;
  taxa: string;
  vencimento: string;
  liquidez: string;
  observacao: string;
  ativo: boolean;
};

const emptyForm = (cliente: string): FormState => ({
  cliente,
  instituicao: "",
  ativo_original: "",
  ativo_novo: "",
  classe_ativo: "",
  emissor: "",
  taxa: "",
  vencimento: "",
  liquidez: "",
  observacao: "",
  ativo: true,
});

export function AssetOverridesTab({
  clientName,
  classesAtivo,
  instituicoes,
  ativosOriginais,
  refreshSignal,
  prefillRequest,
}: AssetOverridesTabProps) {
  const { toast } = useToast();
  const [overrides, setOverrides] = useState<AssetOverride[]>([]);
  const [loading, setLoading] = useState(false);

  const [filterInstituicao, setFilterInstituicao] = useState<string>("__all__");
  const [searchAtivo, setSearchAtivo] = useState("");

  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [form, setForm] = useState<FormState>(emptyForm(clientName));
  const [saving, setSaving] = useState(false);

  const [deleteId, setDeleteId] = useState<string | null>(null);

  const fetchOverrides = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("asset_overrides" as any)
        .select("*")
        .eq("cliente", clientName)
        .order("instituicao", { ascending: true })
        .order("ativo_original", { ascending: true });
      if (error) throw error;
      setOverrides((data || []) as unknown as AssetOverride[]);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar regras",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (clientName) fetchOverrides();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clientName, refreshSignal]);

  const filtered = useMemo(() => {
    let data = overrides;
    if (filterInstituicao && filterInstituicao !== "__all__") {
      data = data.filter((o) => o.instituicao === filterInstituicao);
    }
    if (searchAtivo.trim()) {
      const q = searchAtivo.toLowerCase();
      data = data.filter(
        (o) =>
          o.ativo_original.toLowerCase().includes(q) ||
          (o.ativo_novo || "").toLowerCase().includes(q) ||
          (o.emissor || "").toLowerCase().includes(q)
      );
    }
    return data;
  }, [overrides, filterInstituicao, searchAtivo]);

  const openCreate = () => {
    setForm(emptyForm(clientName));
    setIsDialogOpen(true);
  };

  const openEdit = (o: AssetOverride) => {
    setForm({
      id: o.id,
      cliente: o.cliente,
      instituicao: o.instituicao,
      ativo_original: o.ativo_original,
      ativo_novo: o.ativo_novo || "",
      classe_ativo: o.classe_ativo || "",
      emissor: o.emissor || "",
      taxa: o.taxa || "",
      vencimento: o.vencimento || "",
      liquidez: o.liquidez || "",
      observacao: o.observacao || "",
      ativo: o.ativo,
    });
    setIsDialogOpen(true);
  };

  const handleSave = async () => {
    if (!form.cliente || !form.instituicao || !form.ativo_original) {
      toast({
        title: "Campos obrigatórios",
        description: "Cliente, Instituição e Ativo Original são obrigatórios.",
        variant: "destructive",
      });
      return;
    }

    const hasOverride =
      form.ativo_novo ||
      form.classe_ativo ||
      form.emissor ||
      form.taxa ||
      form.vencimento ||
      form.liquidez;

    if (!hasOverride) {
      toast({
        title: "Nenhum campo para sobrescrever",
        description:
          "Preencha pelo menos um dos campos de ajuste (Nome, Classe, Emissor, Taxa, Vencimento ou Liquidez).",
        variant: "destructive",
      });
      return;
    }

    setSaving(true);
    try {
      const payload = {
        cliente: form.cliente,
        instituicao: form.instituicao,
        ativo_original: form.ativo_original.trim(),
        ativo_novo: form.ativo_novo.trim() || null,
        classe_ativo: form.classe_ativo || null,
        emissor: form.emissor.trim() || null,
        taxa: form.taxa.trim() || null,
        vencimento: form.vencimento || null,
        liquidez: form.liquidez.trim() || null,
        observacao: form.observacao.trim() || null,
        ativo: form.ativo,
      };

      if (form.id) {
        const { error } = await supabase
          .from("asset_overrides" as any)
          .update(payload)
          .eq("id", form.id);
        if (error) throw error;
        toast({ title: "Regra atualizada" });
      } else {
        const { error } = await supabase
          .from("asset_overrides" as any)
          .insert(payload);
        if (error) {
          if ((error as any).code === "23505") {
            toast({
              title: "Regra duplicada",
              description:
                "Já existe uma regra para este cliente + instituição + ativo original.",
              variant: "destructive",
            });
            return;
          }
          throw error;
        }
        toast({ title: "Regra criada" });
      }

      setIsDialogOpen(false);
      await fetchOverrides();
    } catch (error: any) {
      toast({
        title: "Erro ao salvar regra",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSaving(false);
    }
  };

  const handleToggleAtivo = async (o: AssetOverride) => {
    try {
      const { error } = await supabase
        .from("asset_overrides" as any)
        .update({ ativo: !o.ativo })
        .eq("id", o.id);
      if (error) throw error;
      await fetchOverrides();
    } catch (error: any) {
      toast({
        title: "Erro ao alterar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      const { error } = await supabase
        .from("asset_overrides" as any)
        .delete()
        .eq("id", deleteId);
      if (error) throw error;
      toast({ title: "Regra excluída" });
      setDeleteId(null);
      await fetchOverrides();
    } catch (error: any) {
      toast({
        title: "Erro ao excluir",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between mb-2">
          <CardTitle className="flex items-center gap-2">
            <Wand2 className="h-5 w-5 text-primary" />
            Ajustes de Ativos
          </CardTitle>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={fetchOverrides}
              disabled={loading}
            >
              <RefreshCw
                className={`h-4 w-4 mr-1 ${loading ? "animate-spin" : ""}`}
              />
              Atualizar
            </Button>
            <Button size="sm" onClick={openCreate}>
              <Plus className="h-4 w-4 mr-1" />
              Nova regra
            </Button>
          </div>
        </div>
        <p className="text-sm text-muted-foreground">
          Regras aplicadas pelo pipeline (n8n) na ingestão. Cada regra reescreve
          os campos preenchidos quando o ativo bate com{" "}
          <strong>Cliente + Instituição + Ativo Original</strong>.
        </p>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-3">
          <div className="relative flex-1 max-w-xs">
            <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar ativo, novo nome ou emissor..."
              value={searchAtivo}
              onChange={(e) => setSearchAtivo(e.target.value)}
              className="pl-8 h-9"
            />
          </div>
          <Select
            value={filterInstituicao}
            onValueChange={setFilterInstituicao}
          >
            <SelectTrigger className="w-56 h-9">
              <SelectValue placeholder="Todas as instituições" />
            </SelectTrigger>
            <SelectContent className="bg-background z-50">
              <SelectItem value="__all__">Todas as instituições</SelectItem>
              {instituicoes.map((i) => (
                <SelectItem key={i} value={i}>
                  {i}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Badge variant="outline" className="ml-auto">
            {filtered.length} de {overrides.length} regra(s)
          </Badge>
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Instituição</TableHead>
                <TableHead>Ativo Original</TableHead>
                <TableHead>Reescreve para</TableHead>
                <TableHead>Classe</TableHead>
                <TableHead>Emissor</TableHead>
                <TableHead>Taxa</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Liquidez</TableHead>
                <TableHead className="text-center">Ativa</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.length === 0 ? (
                <TableRow>
                  <TableCell
                    colSpan={10}
                    className="text-center text-muted-foreground py-8"
                  >
                    {overrides.length === 0
                      ? 'Nenhuma regra cadastrada. Clique em "Nova regra" para começar.'
                      : "Nenhuma regra corresponde ao filtro."}
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((o) => (
                  <TableRow key={o.id} className={!o.ativo ? "opacity-50" : ""}>
                    <TableCell className="font-medium">
                      {o.instituicao}
                    </TableCell>
                    <TableCell className="max-w-[220px] truncate" title={o.ativo_original}>
                      {o.ativo_original}
                    </TableCell>
                    <TableCell className="max-w-[220px]">
                      {o.ativo_novo ? (
                        <span className="flex items-center gap-1">
                          <ArrowRight className="h-3 w-3 text-muted-foreground" />
                          <span className="truncate" title={o.ativo_novo}>
                            {o.ativo_novo}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground text-xs">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {o.classe_ativo || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {o.emissor || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {o.taxa || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {o.vencimento || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-xs">
                      {o.liquidez || (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Switch
                        checked={o.ativo}
                        onCheckedChange={() => handleToggleAtivo(o)}
                      />
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0"
                          onClick={() => openEdit(o)}
                          title="Editar"
                        >
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-8 w-8 p-0 text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(o.id)}
                          title="Excluir"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      {/* Create / Edit dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Wand2 className="h-5 w-5 text-primary" />
              {form.id ? "Editar regra" : "Nova regra de ajuste"}
            </DialogTitle>
            <DialogDescription>
              Quando o ativo casar com a chave abaixo, o pipeline aplica os
              campos preenchidos. Campos vazios mantêm o valor original.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Chave (identifica o ativo)
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Cliente</Label>
                  <Input value={form.cliente} disabled className="bg-muted" />
                </div>
                <div>
                  <Label>Instituição *</Label>
                  <Select
                    value={form.instituicao}
                    onValueChange={(v) =>
                      setForm({ ...form, instituicao: v })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione..." />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50">
                      {instituicoes.map((i) => (
                        <SelectItem key={i} value={i}>
                          {i}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="mt-3">
                <Label>Ativo Original *</Label>
                <Input
                  value={form.ativo_original}
                  onChange={(e) =>
                    setForm({ ...form, ativo_original: e.target.value })
                  }
                  placeholder="Nome exato como vem do extrato"
                  list="ativos-originais-datalist"
                />
                <datalist id="ativos-originais-datalist">
                  {ativosOriginais.map((a) => (
                    <option key={a} value={a} />
                  ))}
                </datalist>
                <p className="text-xs text-muted-foreground mt-1">
                  O matching com extratos é case-sensitive.
                </p>
              </div>
            </div>

            <Separator />

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground mb-2">
                Reescrever para
              </h4>
              <div className="grid grid-cols-2 gap-3">
                <div className="col-span-2">
                  <Label>Novo nome do ativo</Label>
                  <Input
                    value={form.ativo_novo}
                    onChange={(e) =>
                      setForm({ ...form, ativo_novo: e.target.value })
                    }
                    placeholder="Deixe vazio para manter o nome original"
                  />
                </div>
                <div>
                  <Label>Classe do Ativo</Label>
                  <Select
                    value={form.classe_ativo || "__none__"}
                    onValueChange={(v) =>
                      setForm({
                        ...form,
                        classe_ativo: v === "__none__" ? "" : v,
                      })
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="(manter)" />
                    </SelectTrigger>
                    <SelectContent className="bg-background z-50 max-h-[200px]">
                      <SelectItem value="__none__">(manter)</SelectItem>
                      {classesAtivo.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Emissor</Label>
                  <Input
                    value={form.emissor}
                    onChange={(e) =>
                      setForm({ ...form, emissor: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label>Taxa</Label>
                  <Input
                    value={form.taxa}
                    onChange={(e) =>
                      setForm({ ...form, taxa: e.target.value })
                    }
                    placeholder="Ex: CDI+2%, IPCA+5,5%"
                  />
                </div>
                <div>
                  <Label>Vencimento</Label>
                  <Input
                    type="date"
                    value={form.vencimento}
                    onChange={(e) =>
                      setForm({ ...form, vencimento: e.target.value })
                    }
                  />
                </div>
                <div className="col-span-2">
                  <Label>Liquidez</Label>
                  <Input
                    value={form.liquidez}
                    onChange={(e) => {
                      const num = e.target.value.replace(/\D/g, "");
                      setForm({
                        ...form,
                        liquidez: num ? `D+${num}` : "",
                      });
                    }}
                    placeholder="Ex: D+0, D+30, D+90"
                  />
                </div>
              </div>
            </div>

            <Separator />

            <div>
              <Label>Observação</Label>
              <Textarea
                value={form.observacao}
                onChange={(e) =>
                  setForm({ ...form, observacao: e.target.value })
                }
                placeholder="Anote o motivo do ajuste (opcional)"
                rows={2}
              />
            </div>

            <div className="flex items-center justify-between rounded-lg border p-3">
              <div>
                <Label className="text-sm font-medium">Regra ativa</Label>
                <p className="text-xs text-muted-foreground">
                  Quando desligada, o pipeline ignora esta regra.
                </p>
              </div>
              <Switch
                checked={form.ativo}
                onCheckedChange={(v) => setForm({ ...form, ativo: v })}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setIsDialogOpen(false)}
              disabled={saving}
            >
              Cancelar
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? "Salvando..." : form.id ? "Salvar" : "Criar regra"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirm */}
      <AlertDialog
        open={!!deleteId}
        onOpenChange={(open) => !open && setDeleteId(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir regra?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação não pode ser desfeita. O pipeline (n8n) deixará de
              aplicar este ajuste em ingestões futuras.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
}
