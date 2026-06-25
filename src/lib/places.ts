export interface Place {
  name: string;
  center: [number, number];
  zoom: number;
}

export const PLACES: Place[] = [
  { name: "Paris", center: [2.35, 48.85], zoom: 11 },
  { name: "London", center: [-0.12, 51.5], zoom: 11 },
  { name: "New York", center: [-74.0, 40.71], zoom: 11 },
  { name: "Tokyo", center: [139.7, 35.68], zoom: 11 },
  { name: "San Francisco", center: [-122.43, 37.77], zoom: 12 },
  { name: "Alps (terrain)", center: [7.66, 45.97], zoom: 9 },
  { name: "World", center: [10, 30], zoom: 1.6 },
];
