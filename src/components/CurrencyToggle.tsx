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
      size="default"
      onClick={handleToggle}
      className="bg-card/50 border-primary/20 hover:bg-primary/10 gap-2"
    >
      <DollarSign className="h-5 w-5" />
      <span className="text-sm font-semibold">
        {currency}
      </span>
    </Button>
  );
}
