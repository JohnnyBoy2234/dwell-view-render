import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Home, AlertCircle } from "lucide-react";

interface NoResultsMessageProps {
  onClearFilters: () => void;
  onShowAllProperties: () => void;
}

export const NoResultsMessage = ({ onClearFilters, onShowAllProperties }: NoResultsMessageProps) => {
  return (
    <Card className="p-8 md:p-12 text-center bg-white border border-ocean-blue/20 shadow-soft">
      <AlertCircle className="h-12 w-12 md:h-16 md:w-16 mx-auto mb-4 text-orange-500" />
      <h3 className="text-lg md:text-xl font-semibold mb-2 text-foreground">No properties match your filters</h3>
      <p className="text-sm md:text-base text-muted-foreground mb-6 max-w-md mx-auto">
        We couldn't find any properties that match your current search criteria. Try adjusting your filters or browse all available properties.
      </p>
      <div className="flex flex-col sm:flex-row gap-3 justify-center">
        <Button 
          variant="outline" 
          onClick={onClearFilters}
          className="border-ocean-blue/30 text-ocean-blue hover:bg-ocean-blue hover:text-white"
        >
          Clear Filters
        </Button>
        <Button 
          onClick={onShowAllProperties}
          className="bg-ocean-blue hover:bg-ocean-blue-dark text-white"
        >
          <Home className="h-4 w-4 mr-2" />
          Browse All Properties
        </Button>
      </div>
    </Card>
  );
};