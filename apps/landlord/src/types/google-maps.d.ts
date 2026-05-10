// Google Maps API type declarations
declare global {
  interface Window {
    google?: {
      maps?: {
        places?: {
          AutocompleteService: any;
          PlacesService: any;
          PlacesServiceStatus: { OK: string };
          PlaceAutocompleteElement: any;
          Autocomplete: any;
        };
        event?: {
          clearInstanceListeners: (instance: any) => void;
          addListener: (instance: any, eventName: string, handler: Function) => void;
        };
      };
    };
    initGoogleMaps?: () => void;
  }
}

export {};
