// In-memory data stores (reset on server restart)
export const bins = [
  { id: "b1", lat: 8.54660, lng: 76.90400, type: "paper" },
  { id: "b2", lat: 8.54680, lng: 76.90430, type: "plastic" },
  { id: "b3", lat: 8.54640, lng: 76.90390, type: "metal" }
];

export const complaints = []; // {id, username, title, description, binId|null, status:"open"|"solved", createdAt}
export const schedules = [];  // {id, date, time, area, note}