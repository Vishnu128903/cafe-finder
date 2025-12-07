# Café Finder – Location-Based Cafe Locator

This small front-end project helps users quickly find cafés in an area using an interactive map, autocomplete search, and a clean, modern interface.

> Built with **HTML, CSS, JavaScript**, and the **Google Maps JavaScript + Places APIs**.

---

## Features

- **Default India View**  
  - The map loads zoomed out over **India**, allowing users to see the country right away.

- **Smart Location Search (Autocomplete)**  
  - The search box provides live **suggestions while typing** (e.g., typing `hyde` suggests **Hyderabad**).
  - Indian locations appear **first**, followed by matching results from other countries.

- **Use My Location**  
  - A button centers the map on the user’s current location using the browser’s Geolocation API.

- **Nearby Cafés Panel**  
  - A list of cafés appears in a sidebar next to the map.
  - Users can click a café in the list to:
    - Focus the map on it
    - Open a popup on the marker

- **Custom Coffee Markers**  
  - Map markers are replaced with a **coffee-cup icon** to match the theme.

- **Responsive Dark UI**  
  - The modern, dark theme layout works on both desktop and smaller screens.

---

## Tech Stack

- **Frontend:** HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Map & Places:**
  - Google Maps JavaScript API  
  - Google Places API (Nearby Search / Text Search / Autocomplete)
- **Other:**  
  - Browser Geolocation API

---

## Project Structure

```text
cafe-finder/
├─ index.html        # Main HTML file
├─ css/
│  └─ styles.css     # All styling for layout & dark theme
├─ js/
│  └─ app.js         # Core logic: map, search, suggestions, cafés list
│
└─ assets/
   └─ coffee.svg # Custom coffee marker icon
```
