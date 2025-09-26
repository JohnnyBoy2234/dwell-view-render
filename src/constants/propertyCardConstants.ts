export const PROPERTY_CARD_STYLES = {
  CARD: "group hover:shadow-xl transition-all duration-300 hover:-translate-y-2 cursor-pointer backdrop-blur-sm bg-white/95 dark:bg-black/40 border border-white/20 shadow-lg h-full flex flex-col",
  IMAGE_CONTAINER: "relative overflow-hidden rounded-t-lg",
  IMAGE: "w-full h-48 object-cover transition-transform duration-300 group-hover:scale-105",
  FEATURED_BADGE: "absolute top-3 left-3 bg-accent text-accent-foreground",
  CONTENT: "p-4 flex-1 flex flex-col",
  CONTENT_INNER: "space-y-2 flex-1 flex flex-col",
  HEADER: "flex items-center justify-between",
  TYPE_BADGE: "line-clamp-1",
  PRICE: "font-semibold text-lg line-clamp-1",
  LOCATION_CONTAINER: "flex items-center text-muted-foreground",
  LOCATION_ICON: "h-4 w-4 mr-1 flex-shrink-0",
  LOCATION_TEXT: "text-sm line-clamp-1",
  FEATURES_CONTAINER: "flex items-center space-x-4 text-sm text-muted-foreground mt-auto",
  FEATURE_ITEM: "flex items-center",
  FEATURE_ICON: "h-4 w-4 mr-1 flex-shrink-0",
} as const;

export const PROPERTY_CARD_LABELS = {
  FEATURED: "Featured",
  BEDS: "beds",
  BATHS: "baths", 
  PARKING: "parking",
} as const;

export const PROPERTY_CARD_CURRENCY = {
  SYMBOL: "R",
  SEPARATOR: "/month",
} as const;