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
      className="group hover:shadow-lg transition-all duration-300 hover:-translate-y-1 cursor-pointer"
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
          alt={title}
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
            <span className="text-2xl font-bold text-primary">
              R{price.toLocaleString()}
              <span className="text-sm font-normal text-muted-foreground">/month</span>
            </span>
          </div>
          
          <h3 className="font-semibold text-lg line-clamp-1">{title}</h3>
          
          <div className="flex items-center text-muted-foreground">
            <MapPin className="h-4 w-4 mr-1" />
            <span className="text-sm">{location}</span>
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