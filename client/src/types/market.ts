export interface Address {
  id : number;
  street: string;
  zipCode: string;
  city: string;
  latitude: number;
  longitude: number;
}

export interface Product {
  id: number;
  name: string;
  market : Market;
  price: number;
  imageUrl : string;
  grammage : string;
  lastUpdated?: string; // ISO date string from LocalDateTime
}

export interface Market {
  id: number; // Matches Java 'private Long reweId'
  name: string;
  address: Address; // Matches Java 'private Address address'
  lastUpdated?: string; // ISO date string from LocalDateTime
  products?: Product[]; // Optional list of products
  
  // Frontend-specific fields (computed or placeholders until backend provides them)
  distance?: string; 
  hours?: string;
  rating?: number;
  image?: string;
}

export interface MarketSearchRequest {
  postalCode: string;
}