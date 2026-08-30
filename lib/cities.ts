/**
 * Cities offered as suggestions once a state is chosen, for the checkout form.
 *
 * IMPORTANT — THIS IS A SUGGESTION LIST, NOT A WHITELIST. The field stays a
 * free-text input backed by a `<datalist>`, so choosing from the list is one
 * tap while typing something absent still works.
 *
 * That distinction is the whole design. India has thousands of towns, and a
 * shop that ships pan-India sells to plenty of places no hand-kept list will
 * ever hold. A strict dropdown would turn "your town is not in our list" into
 * a lost sale at the last step of checkout, which is far worse than an
 * occasional typo in an address the courier reads anyway. The pincode is the
 * field that actually routes the parcel.
 *
 * So this covers the cities that come up often — the metros, the state
 * capitals, and the Tamil Nadu towns a Coimbatore shop posts to most — and
 * quietly gets out of the way for everywhere else.
 */
export const CITIES_BY_STATE: Record<string, string[]> = {
  'Andhra Pradesh': [
    'Visakhapatnam', 'Vijayawada', 'Guntur', 'Nellore', 'Kurnool', 'Rajahmundry',
    'Tirupati', 'Kakinada', 'Anantapur', 'Kadapa', 'Eluru', 'Ongole',
  ],
  'Arunachal Pradesh': ['Itanagar', 'Naharlagun', 'Pasighat', 'Tezu', 'Ziro'],
  Assam: [
    'Guwahati', 'Silchar', 'Dibrugarh', 'Jorhat', 'Nagaon', 'Tinsukia', 'Tezpur', 'Bongaigaon',
  ],
  Bihar: [
    'Patna', 'Gaya', 'Bhagalpur', 'Muzaffarpur', 'Darbhanga', 'Purnia', 'Bihar Sharif', 'Ara',
  ],
  Chandigarh: ['Chandigarh'],
  Chhattisgarh: ['Raipur', 'Bhilai', 'Bilaspur', 'Korba', 'Durg', 'Rajnandgaon', 'Jagdalpur'],
  'Dadra and Nagar Haveli and Daman and Diu': ['Silvassa', 'Daman', 'Diu'],
  Delhi: ['New Delhi', 'Delhi', 'Dwarka', 'Rohini', 'Saket', 'Karol Bagh', 'Pitampura'],
  Goa: ['Panaji', 'Margao', 'Vasco da Gama', 'Mapusa', 'Ponda'],
  Gujarat: [
    'Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Bhavnagar', 'Jamnagar', 'Gandhinagar',
    'Junagadh', 'Anand', 'Bharuch', 'Navsari', 'Mehsana',
  ],
  Haryana: [
    'Gurugram', 'Faridabad', 'Panipat', 'Ambala', 'Hisar', 'Karnal', 'Rohtak', 'Sonipat', 'Panchkula',
  ],
  'Himachal Pradesh': ['Shimla', 'Dharamshala', 'Solan', 'Mandi', 'Kullu', 'Manali', 'Una'],
  'Jammu and Kashmir': ['Srinagar', 'Jammu', 'Anantnag', 'Baramulla', 'Udhampur', 'Kathua'],
  Jharkhand: ['Ranchi', 'Jamshedpur', 'Dhanbad', 'Bokaro Steel City', 'Deoghar', 'Hazaribagh'],
  Karnataka: [
    'Bengaluru', 'Mysuru', 'Hubballi', 'Mangaluru', 'Belagavi', 'Davanagere', 'Ballari',
    'Kalaburagi', 'Shivamogga', 'Tumakuru', 'Udupi', 'Hassan', 'Bidar',
  ],
  Kerala: [
    'Kochi', 'Thiruvananthapuram', 'Kozhikode', 'Thrissur', 'Kollam', 'Kannur', 'Alappuzha',
    'Palakkad', 'Kottayam', 'Malappuram', 'Pathanamthitta', 'Idukki',
  ],
  Ladakh: ['Leh', 'Kargil'],
  Lakshadweep: ['Kavaratti', 'Agatti', 'Minicoy'],
  'Madhya Pradesh': [
    'Indore', 'Bhopal', 'Jabalpur', 'Gwalior', 'Ujjain', 'Sagar', 'Satna', 'Rewa', 'Ratlam',
  ],
  Maharashtra: [
    'Mumbai', 'Pune', 'Nagpur', 'Nashik', 'Thane', 'Aurangabad', 'Solapur', 'Navi Mumbai',
    'Kolhapur', 'Amravati', 'Nanded', 'Sangli', 'Jalgaon', 'Akola', 'Satara',
  ],
  Manipur: ['Imphal', 'Thoubal', 'Bishnupur', 'Churachandpur'],
  Meghalaya: ['Shillong', 'Tura', 'Jowai', 'Nongstoin'],
  Mizoram: ['Aizawl', 'Lunglei', 'Champhai', 'Serchhip'],
  Nagaland: ['Kohima', 'Dimapur', 'Mokokchung', 'Wokha'],
  Odisha: [
    'Bhubaneswar', 'Cuttack', 'Rourkela', 'Berhampur', 'Sambalpur', 'Puri', 'Balasore',
  ],
  Puducherry: ['Puducherry', 'Karaikal', 'Yanam', 'Mahe'],
  Punjab: [
    'Ludhiana', 'Amritsar', 'Jalandhar', 'Patiala', 'Bathinda', 'Mohali', 'Pathankot', 'Hoshiarpur',
  ],
  Rajasthan: [
    'Jaipur', 'Jodhpur', 'Udaipur', 'Kota', 'Ajmer', 'Bikaner', 'Alwar', 'Bhilwara', 'Sikar',
  ],
  Sikkim: ['Gangtok', 'Namchi', 'Gyalshing', 'Mangan'],
  // Listed most fully: this is where most of the shop's parcels go.
  'Tamil Nadu': [
    'Coimbatore', 'Chennai', 'Madurai', 'Tiruchirappalli', 'Salem', 'Tirunelveli', 'Erode',
    'Tiruppur', 'Vellore', 'Thoothukudi', 'Thanjavur', 'Dindigul', 'Kanchipuram', 'Karur',
    'Namakkal', 'Cuddalore', 'Kumbakonam', 'Hosur', 'Nagercoil', 'Pollachi', 'Sivakasi',
    'Rajapalayam', 'Udhagamandalam', 'Villupuram', 'Tiruvannamalai', 'Krishnagiri', 'Dharmapuri',
    'Virudhunagar', 'Ramanathapuram', 'Pudukkottai', 'Ariyalur', 'Perambalur', 'Nagapattinam',
    'Theni', 'Tenkasi', 'Kallakurichi', 'Chengalpattu', 'Tiruvallur', 'Mettupalayam', 'Avinashi',
  ],
  Telangana: [
    'Hyderabad', 'Warangal', 'Nizamabad', 'Karimnagar', 'Khammam', 'Secunderabad', 'Ramagundam',
  ],
  Tripura: ['Agartala', 'Udaipur', 'Dharmanagar', 'Kailashahar'],
  'Uttar Pradesh': [
    'Lucknow', 'Kanpur', 'Ghaziabad', 'Agra', 'Varanasi', 'Meerut', 'Prayagraj', 'Noida',
    'Bareilly', 'Aligarh', 'Moradabad', 'Gorakhpur', 'Saharanpur', 'Jhansi', 'Mathura', 'Ayodhya',
  ],
  Uttarakhand: ['Dehradun', 'Haridwar', 'Roorkee', 'Haldwani', 'Rishikesh', 'Nainital', 'Rudrapur'],
  'West Bengal': [
    'Kolkata', 'Howrah', 'Durgapur', 'Asansol', 'Siliguri', 'Bardhaman', 'Malda', 'Kharagpur',
    'Darjeeling', 'Haldia',
  ],
  'Andaman and Nicobar Islands': ['Port Blair', 'Car Nicobar', 'Mayabunder'],
};

/** Suggestions for a state, or an empty list when none is chosen yet. */
export function citiesForState(state: string | null | undefined): string[] {
  if (!state) return [];
  return CITIES_BY_STATE[state] ?? [];
}
