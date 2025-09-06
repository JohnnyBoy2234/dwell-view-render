import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

import { MapPin, Bed, Bath, Car } from "lucide-react";

import { useNavigate } from "react-router-dom";

interface PropertyCardProps {
  id: string;
  title: string;
  location: string;
  price: number;
  beds: number;
  baths: number;
  parking: number;
  image: string;
  type: string;
  featured?: boolean;
}

const PropertyCard = ({
  id,
  title,
  location,
  price,
  beds,
  baths,
  parking,
  image,
  type,
  featured = false,
}: PropertyCardProps) => {
  const navigate = useNavigate();


  return (
    <Card 
      className="group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer backdrop-blur-sm bg-white/95 dark:bg-black/40 border border-white/20 shadow-lg"
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/property/${id}`)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          navigate(`/property/${id}`);
        }
      }}
    >
      <div className="relative overflow-hidden rounded-t-lg">
        <img
          src={image}
          alt={`${type} in ${location}`}
          className="w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105"
        />
        {featured && (
          <Badge className="absolute top-3 left-3 bg-accent text-accent-foreground">
            Featured
          </Badge>
        )}
      </div>

      <CardContent className="p-4">
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Badge variant="secondary">{type}</Badge>
          </div>
          
          <h3 className="font-semibold text-lg line-clamp-1">R{price.toLocaleString()}/month</h3>
          
          <div className="flex items-center text-muted-foreground">
            <MapPin className="h-4 w-4 mr-1" />
            <span className="text-sm">{type} in {location}</span>
          </div>

          <div className="flex items-center space-x-4 text-sm text-muted-foreground">
            <div className="flex items-center">
              <Bed className="h-4 w-4 mr-1" />
              <span>{beds} beds</span>
            </div>
            <div className="flex items-center">
              <Bath className="h-4 w-4 mr-1" />
              <span>{baths} baths</span>
            </div>
            {parking > 0 && (
              <div className="flex items-center">
                <Car className="h-4 w-4 mr-1" />
                <span>{parking} parking</span>
              </div>
            )}
          </div>
        </div>
      </CardContent>

    </Card>
  );
};

export default PropertyCard;