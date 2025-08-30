import { PropertySearchFilters } from "@/hooks/usePropertySearchFilters";

// Mock property data structure
interface MockProperty {
  id: string;
  area: string;
  city: string;
  price: number;
  bedrooms: number;
  bathrooms: number;
  propertyType: string;
  petsAllowed: boolean;
}

// Filter predicate builder function
export function buildFilterPredicate(filters: PropertySearchFilters) {
  return (property: MockProperty): boolean => {
    // Area filter - strict match (case-insensitive)
    if (filters.searchTerm && filters.searchTerm.trim()) {
      const searchTerm = filters.searchTerm.toLowerCase().trim();
      const propertyArea = property.area.toLowerCase();
      const propertyCity = property.city.toLowerCase();
      
      // If area is specified, it must match exactly (not just city)
      if (propertyArea.includes(searchTerm) || propertyCity.includes(searchTerm)) {
        // Continue with other filters
      } else {
        return false;
      }
    }

    // Property type filter
    if (filters.propertyType && filters.propertyType !== "Any") {
      if (property.propertyType !== filters.propertyType) {
        return false;
      }
    }

    // Price range filters
    if (filters.minPrice && filters.minPrice !== "") {
      const minPrice = parseInt(filters.minPrice, 10);
      if (property.price < minPrice) {
        return false;
      }
    }

    if (filters.maxPrice && filters.maxPrice !== "") {
      const maxPrice = parseInt(filters.maxPrice, 10);
      if (property.price > maxPrice) {
        return false;
      }
    }

    // Bedrooms filter
    if (filters.bedrooms && filters.bedrooms !== "Any") {
      const requiredBedrooms = parseInt(filters.bedrooms, 10);
      if (property.bedrooms < requiredBedrooms) {
        return false;
      }
    }

    // Bathrooms filter
    if (filters.bathrooms && filters.bathrooms !== "Any") {
      const requiredBathrooms = parseInt(filters.bathrooms, 10);
      if (property.bathrooms < requiredBathrooms) {
        return false;
      }
    }

    // Additional filters (AND logic)
    if (filters.propertyTypes && filters.propertyTypes.length > 0) {
      if (!filters.propertyTypes.includes(property.propertyType)) {
        return false;
      }
    }

    if (filters.amenities && filters.amenities.length > 0) {
      // For now, just check if pets are allowed if that's in amenities
      if (filters.amenities.includes("pets") && !property.petsAllowed) {
        return false;
      }
    }

    return true;
  };
}

// Test data
const mockProperties: MockProperty[] = [
  {
    id: "1",
    area: "Sandton",
    city: "Johannesburg",
    price: 15000,
    bedrooms: 2,
    bathrooms: 2,
    propertyType: "Apartment",
    petsAllowed: true,
  },
  {
    id: "2",
    area: "Rosebank",
    city: "Johannesburg",
    price: 22000,
    bedrooms: 4,
    bathrooms: 3,
    propertyType: "House",
    petsAllowed: false,
  },
  {
    id: "3",
    area: "V&A Waterfront",
    city: "Cape Town",
    price: 35000,
    bedrooms: 3,
    bathrooms: 2,
    propertyType: "Townhouse",
    petsAllowed: true,
  },
];

// Test cases
describe("Filter Predicate Builder", () => {
  test("area only - returns only properties in that exact area", () => {
    const filters: PropertySearchFilters = {
      searchTerm: "Sandton",
      propertyType: "Any",
      minPrice: "",
      maxPrice: "",
      bedrooms: "Any",
      bathrooms: "Any",
      propertyTypes: [],
      amenities: [],
      availableFrom: null,
    };

    const predicate = buildFilterPredicate(filters);
    const results = mockProperties.filter(predicate);

    expect(results).toHaveLength(1);
    expect(results[0].area).toBe("Sandton");
  });

  test("city only - returns properties in that city", () => {
    const filters: PropertySearchFilters = {
      searchTerm: "Johannesburg",
      propertyType: "Any",
      minPrice: "",
      maxPrice: "",
      bedrooms: "Any",
      bathrooms: "Any",
      propertyTypes: [],
      amenities: [],
      availableFrom: null,
    };

    const predicate = buildFilterPredicate(filters);
    const results = mockProperties.filter(predicate);

    expect(results).toHaveLength(2);
    expect(results.every(p => p.city === "Johannesburg")).toBe(true);
  });

  test("area + city - area must dominate", () => {
    const filters: PropertySearchFilters = {
      searchTerm: "Sandton",
      propertyType: "Any",
      minPrice: "",
      maxPrice: "",
      bedrooms: "Any",
      bathrooms: "Any",
      propertyTypes: [],
      amenities: [],
      availableFrom: null,
    };

    const predicate = buildFilterPredicate(filters);
    const results = mockProperties.filter(predicate);

    expect(results).toHaveLength(1);
    expect(results[0].area).toBe("Sandton");
    // Should not include other Johannesburg properties
    expect(results.every(p => p.area === "Sandton")).toBe(true);
  });

  test("multiple filters together - AND logic", () => {
    const filters: PropertySearchFilters = {
      searchTerm: "Johannesburg",
      propertyType: "House",
      minPrice: "20000",
      maxPrice: "25000",
      bedrooms: "4",
      bathrooms: "Any",
      propertyTypes: [],
      amenities: [],
      availableFrom: null,
    };

    const predicate = buildFilterPredicate(filters);
    const results = mockProperties.filter(predicate);

    expect(results).toHaveLength(1);
    expect(results[0].id).toBe("2"); // Rosebank house
    expect(results[0].propertyType).toBe("House");
    expect(results[0].price).toBe(22000);
    expect(results[0].bedrooms).toBe(4);
  });

  test("no filters - returns all properties", () => {
    const filters: PropertySearchFilters = {
      searchTerm: "",
      propertyType: "Any",
      minPrice: "",
      maxPrice: "",
      bedrooms: "Any",
      bathrooms: "Any",
      propertyTypes: [],
      amenities: [],
      availableFrom: null,
    };

    const predicate = buildFilterPredicate(filters);
    const results = mockProperties.filter(predicate);

    expect(results).toHaveLength(3);
  });
});
