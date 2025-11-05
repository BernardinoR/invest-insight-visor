import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Filter, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface InstitutionFiltersProps {
  institutions: string[];
  accounts: string[];
  selectedInstitutions: string[];
  selectedAccount: string | null;
  onInstitutionsChange: (institutions: string[]) => void;
  onAccountChange: (account: string | null) => void;
}

export function InstitutionFilters({
  institutions,
  accounts,
  selectedInstitutions,
  selectedAccount,
  onInstitutionsChange,
  onAccountChange,
}: InstitutionFiltersProps) {
  const handleInstitutionToggle = (institution: string) => {
    if (selectedInstitutions.includes(institution)) {
      onInstitutionsChange(selectedInstitutions.filter(i => i !== institution));
    } else {
      onInstitutionsChange([...selectedInstitutions, institution]);
    }
  };

  const handleClearFilters = () => {
    onInstitutionsChange([]);
    onAccountChange(null);
  };

  const hasActiveFilters = selectedInstitutions.length > 0 || selectedAccount !== null;
  const activeFiltersCount = selectedInstitutions.length + (selectedAccount ? 1 : 0);

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="outline" size="sm" className="gap-2">
          <Filter className="h-4 w-4" />
          Filtros
          {hasActiveFilters && (
            <Badge variant="default" className="ml-1 h-5 min-w-5 px-1 text-xs">
              {activeFiltersCount}
            </Badge>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-80 p-4" align="end">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h4 className="font-semibold text-sm">Filtros</h4>
            {hasActiveFilters && (
              <Button
                variant="ghost"
                size="sm"
                onClick={handleClearFilters}
                className="h-auto p-1 text-xs text-muted-foreground hover:text-foreground"
              >
                <X className="h-3 w-3 mr-1" />
                Limpar
              </Button>
            )}
          </div>

          <Separator />

          {/* Instituições */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Instituições</Label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {institutions.length > 0 ? (
                institutions.map((institution) => (
                  <div key={institution} className="flex items-center space-x-2">
                    <Checkbox
                      id={`institution-${institution}`}
                      checked={selectedInstitutions.includes(institution)}
                      onCheckedChange={() => handleInstitutionToggle(institution)}
                    />
                    <label
                      htmlFor={`institution-${institution}`}
                      className="text-sm font-normal cursor-pointer flex-1"
                    >
                      {institution}
                    </label>
                  </div>
                ))
              ) : (
                <p className="text-sm text-muted-foreground">Nenhuma instituição disponível</p>
              )}
            </div>
          </div>

          <Separator />

          {/* Nome da Conta */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Nome da Conta</Label>
            <Select
              value={selectedAccount || "all"}
              onValueChange={(value) => onAccountChange(value === "all" ? null : value)}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Todas as contas" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as contas</SelectItem>
                {accounts.map((account) => (
                  <SelectItem key={account} value={account}>
                    {account}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
}
