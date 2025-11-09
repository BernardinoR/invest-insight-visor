import { Button } from "@/components/ui/button";
import { DollarSign } from "lucide-react";
import { useCurrency } from "@/contexts/CurrencyContext";

export function CurrencyToggle() {
  const { currency, setCurrency, isConverting } = useCurrency();
  
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
      disabled={isConverting}
      className="bg-card/50 border-primary/20 hover:bg-primary/10 gap-2"
    >
      {isConverting ? (
        <>
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
          <span className="text-sm font-semibold">Convertendo...</span>
        </>
      ) : (
        <>
          <DollarSign className="h-5 w-5" />
          <span className="text-sm font-semibold">
            {currency}
          </span>
        </>
      )}
    </Button>
  );
}
