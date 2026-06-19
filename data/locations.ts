// Bundled location list for the Rhythm vertical's sunrise/sunset. India-only for V1 (IST is fixed
// UTC+5:30 — no DST edge cases). Sunrise/sunset timing is driven by longitude; a nearby major city
// puts you within a few minutes, which is plenty for a "catch some morning light" nudge.
//
// Curated to major cities + state/UT capitals (coordinates accurate to ~0.1°, i.e. well under a
// minute of solar time). The picker is a search box, so this can grow to full districts later with
// no code change — it's pure data.

export interface IndiaLocation {
  city: string;
  state: string;
  lat: number;
  lng: number;
}

export const INDIA_LOCATIONS: IndiaLocation[] = [
  { city: 'New Delhi', state: 'Delhi', lat: 28.61, lng: 77.21 },
  { city: 'Mumbai', state: 'Maharashtra', lat: 19.08, lng: 72.88 },
  { city: 'Kolkata', state: 'West Bengal', lat: 22.57, lng: 88.36 },
  { city: 'Chennai', state: 'Tamil Nadu', lat: 13.08, lng: 80.27 },
  { city: 'Bengaluru', state: 'Karnataka', lat: 12.97, lng: 77.59 },
  { city: 'Hyderabad', state: 'Telangana', lat: 17.39, lng: 78.49 },
  { city: 'Ahmedabad', state: 'Gujarat', lat: 23.03, lng: 72.58 },
  { city: 'Pune', state: 'Maharashtra', lat: 18.52, lng: 73.86 },
  { city: 'Jaipur', state: 'Rajasthan', lat: 26.91, lng: 75.79 },
  { city: 'Lucknow', state: 'Uttar Pradesh', lat: 26.85, lng: 80.95 },
  { city: 'Kanpur', state: 'Uttar Pradesh', lat: 26.45, lng: 80.33 },
  { city: 'Nagpur', state: 'Maharashtra', lat: 21.15, lng: 79.09 },
  { city: 'Indore', state: 'Madhya Pradesh', lat: 22.72, lng: 75.86 },
  { city: 'Bhopal', state: 'Madhya Pradesh', lat: 23.26, lng: 77.41 },
  { city: 'Patna', state: 'Bihar', lat: 25.59, lng: 85.14 },
  { city: 'Surat', state: 'Gujarat', lat: 21.17, lng: 72.83 },
  { city: 'Vadodara', state: 'Gujarat', lat: 22.31, lng: 73.18 },
  { city: 'Rajkot', state: 'Gujarat', lat: 22.30, lng: 70.80 },
  { city: 'Visakhapatnam', state: 'Andhra Pradesh', lat: 17.69, lng: 83.22 },
  { city: 'Vijayawada', state: 'Andhra Pradesh', lat: 16.51, lng: 80.65 },
  { city: 'Kochi', state: 'Kerala', lat: 9.93, lng: 76.27 },
  { city: 'Thiruvananthapuram', state: 'Kerala', lat: 8.52, lng: 76.94 },
  { city: 'Coimbatore', state: 'Tamil Nadu', lat: 11.02, lng: 76.96 },
  { city: 'Madurai', state: 'Tamil Nadu', lat: 9.93, lng: 78.12 },
  { city: 'Mysuru', state: 'Karnataka', lat: 12.30, lng: 76.64 },
  { city: 'Mangaluru', state: 'Karnataka', lat: 12.91, lng: 74.86 },
  { city: 'Guwahati', state: 'Assam', lat: 26.14, lng: 91.74 },
  { city: 'Bhubaneswar', state: 'Odisha', lat: 20.30, lng: 85.82 },
  { city: 'Ranchi', state: 'Jharkhand', lat: 23.34, lng: 85.31 },
  { city: 'Jamshedpur', state: 'Jharkhand', lat: 22.80, lng: 86.18 },
  { city: 'Raipur', state: 'Chhattisgarh', lat: 21.25, lng: 81.63 },
  { city: 'Chandigarh', state: 'Chandigarh', lat: 30.73, lng: 76.78 },
  { city: 'Amritsar', state: 'Punjab', lat: 31.63, lng: 74.87 },
  { city: 'Ludhiana', state: 'Punjab', lat: 30.90, lng: 75.86 },
  { city: 'Dehradun', state: 'Uttarakhand', lat: 30.32, lng: 78.03 },
  { city: 'Shimla', state: 'Himachal Pradesh', lat: 31.10, lng: 77.17 },
  { city: 'Srinagar', state: 'Jammu & Kashmir', lat: 34.08, lng: 74.80 },
  { city: 'Jammu', state: 'Jammu & Kashmir', lat: 32.73, lng: 74.86 },
  { city: 'Gurugram', state: 'Haryana', lat: 28.46, lng: 77.03 },
  { city: 'Faridabad', state: 'Haryana', lat: 28.41, lng: 77.31 },
  { city: 'Noida', state: 'Uttar Pradesh', lat: 28.54, lng: 77.39 },
  { city: 'Agra', state: 'Uttar Pradesh', lat: 27.18, lng: 78.01 },
  { city: 'Varanasi', state: 'Uttar Pradesh', lat: 25.32, lng: 82.97 },
  { city: 'Prayagraj', state: 'Uttar Pradesh', lat: 25.44, lng: 81.85 },
  { city: 'Meerut', state: 'Uttar Pradesh', lat: 28.98, lng: 77.71 },
  { city: 'Nashik', state: 'Maharashtra', lat: 19.99, lng: 73.79 },
  { city: 'Jodhpur', state: 'Rajasthan', lat: 26.24, lng: 73.02 },
  { city: 'Panaji', state: 'Goa', lat: 15.49, lng: 73.83 },
  { city: 'Puducherry', state: 'Puducherry', lat: 11.94, lng: 79.81 },
  { city: 'Siliguri', state: 'West Bengal', lat: 26.73, lng: 88.39 },
  { city: 'Imphal', state: 'Manipur', lat: 24.82, lng: 93.94 },
  { city: 'Shillong', state: 'Meghalaya', lat: 25.58, lng: 91.89 },
  { city: 'Aizawl', state: 'Mizoram', lat: 23.73, lng: 92.72 },
  { city: 'Kohima', state: 'Nagaland', lat: 25.67, lng: 94.11 },
  { city: 'Itanagar', state: 'Arunachal Pradesh', lat: 27.10, lng: 93.62 },
  { city: 'Agartala', state: 'Tripura', lat: 23.83, lng: 91.28 },
  { city: 'Gangtok', state: 'Sikkim', lat: 27.33, lng: 88.61 },
  { city: 'Port Blair', state: 'Andaman & Nicobar', lat: 11.62, lng: 92.73 },
];
