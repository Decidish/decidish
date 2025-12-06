
export interface User {
  id: number;
  name: string;
  race: string; // "Vouivre"
  description: string;
  location: string;
  coordinates: string; // "29.4600° N..."
  tags: string[]; // ["Seafood Addict", "Spice Hunter", ...]
  status: 'Online' | 'Offline';
  image: any; // for require()
}