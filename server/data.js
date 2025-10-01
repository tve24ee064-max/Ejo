// In-memory data stores (reset on server restart)
export const bins = [
  { id: "b1", lat: 8.546425, lng: 76.906937, type: "metal", location: "Mech Department" },
  { id: "b2", lat: 8.545169, lng: 76.904677, type: "paper", location: "Open Gym" },
  { id: "b3", lat: 8.545369, lng: 76.905679, type: "plastic", location: "EC Department" },
  { id: "b4", lat: 8.545475, lng: 76.906845, type: "paper", location: "Cooperative Store" }
];

export const complaints = []; // {id, username, title, description, binId|null, status:"open"|"solved", createdAt}
export const schedules = [];  // {id, date, time, area, note}