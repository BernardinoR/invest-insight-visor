import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

export function CurrencyToggle() {
  const { currency, setCurrency } = useCurrency();
  
  const handleToggle = () => {
    const newCurrency = currency === 'BRL' ? 'USD' : 'BRL';
    console.log('🔘 Currency toggle clicked:', currency, '→', newCurrency);
    setCurrency(newCurrency);
  };
  
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleToggle}
      className="bg-card/50 border-primary/20 hover:bg-primary/10 gap-2"
    >
      <DollarSign className="h-4 w-4" />
      <span className="text-xs font-semibold">
        {currency}
      </span>
    </Button>
  );
}
