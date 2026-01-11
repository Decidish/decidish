
export interface User {
  id: number;
  name: string;
  level: string;
  completedRecipes: number;
  description: string;
  location: string;
  coordinates: string; // "29.4600° N..."
  tags: string[]; // ["Seafood Addict", "Spice Hunter", ...]
  status: 'Online' | 'Offline';
  friends: number[];
  image: any; // for require()
}