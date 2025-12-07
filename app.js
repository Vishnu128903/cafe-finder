// --- Map setup (default: zoomed-out India) -----------------------

const map = L.map("map", {
  zoomControl: true,
}).setView([22.5937, 78.9629], 5); // India

L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
  maxZoom: 19,
  attribution:
    '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
}).addTo(map);

// Layer where café markers will be placed.
const cafeLayer = L.layerGroup().addTo(map);

// DOM elements
const searchForm = document.getElementById("searchForm");
const searchInput = document.getElementById("searchInput");
const suggestionsEl = document.getElementById("suggestions");
const cafeListEl = document.getElementById("cafeList");



const coffeeIcon = L.icon({
  iconUrl: "coffee.svg",
  iconSize: [32, 32],        // size of the icon
  iconAnchor: [16, 32],      // point of the icon which corresponds to marker location
  popupAnchor: [0, -28],     // popup position relative to icon
});


// --- Helpers ------------------------------------------------------

function debounce(fn, delay) {
  let handle;
  return (...args) => {
    clearTimeout(handle);
    handle = setTimeout(() => fn(...args), delay);
  };
}

function clearSuggestions() {
  suggestionsEl.innerHTML = "";
  suggestionsEl.classList.remove("visible");
}

function formatPlaceLabel(place) {
  const addr = place.address || {};
  const main =
    addr.city ||
    addr.town ||
    addr.village ||
    addr.suburb ||
    addr.neighbourhood ||
    place.display_name.split(",")[0];

  const state = addr.state || addr.county || addr.region;
  const country = addr.country;

  const subParts = [state, country].filter(Boolean);
  return {
    main,
    sub: subParts.join(" • "),
  };
}

// --- Autocomplete (Nominatim) ------------------------------------

const handleInput = debounce(async () => {
  const q = searchInput.value.trim();

  if (q.length < 2) {
    clearSuggestions();
    return;
  }

  try {
    // 1. India-only search
    const indiaUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&countrycodes=in&q=${encodeURIComponent(
      q
    )}`;

    // 2. Global search (fallback / extra)
    const worldUrl = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=6&q=${encodeURIComponent(
      q
    )}`;

    const [indiaRes, worldRes] = await Promise.all([
      fetch(indiaUrl, { headers: { "Accept-Language": "en" } }),
      fetch(worldUrl, { headers: { "Accept-Language": "en" } }),
    ]);

    let india = await indiaRes.json();
    let world = await worldRes.json();

    const allowedTypes = [
      "city",
      "town",
      "village",
      "suburb",
      "neighbourhood",
      "state",
      "district",
      "county",
    ];

    const filterPlaces = (arr) =>
      arr.filter(
        (p) => p.class === "place" && allowedTypes.includes(p.type)
      );

    india = filterPlaces(india);
    world = filterPlaces(world).filter(
      (p) => !india.some((i) => i.place_id === p.place_id)
    );

    const merged = [...india, ...world].slice(0, 8);

    if (!merged.length) {
      clearSuggestions();
      return;
    }

    suggestionsEl.innerHTML = merged
      .map((p) => {
        const label = formatPlaceLabel(p);
        return `<li data-lat="${p.lat}" data-lon="${p.lon}">
                  <span class="main">${label.main}</span>
                  ${
                    label.sub
                      ? `<span class="sub">&nbsp;${label.sub}</span>`
                      : ""
                  }
                </li>`;
      })
      .join("");

    suggestionsEl.classList.add("visible");

    // Attach click handlers
    Array.from(suggestionsEl.querySelectorAll("li")).forEach((li) => {
      li.addEventListener("click", () => {
        const lat = parseFloat(li.dataset.lat);
        const lon = parseFloat(li.dataset.lon);
        const text = li.querySelector(".main").textContent;
        searchInput.value = text;
        clearSuggestions();
        focusAndSearch([lat, lon]);
      });
    });
  } catch (err) {
    console.error("Autocomplete error:", err);
    clearSuggestions();
  }
}, 250);

searchInput.addEventListener("input", handleInput);

// Click outside to hide suggestions
document.addEventListener("click", (e) => {
  if (
    !suggestionsEl.contains(e.target) &&
    e.target !== searchInput
  ) {
    clearSuggestions();
  }
});

// --- Search submit -----------------------------------------------

searchForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const q = searchInput.value.trim();
  if (!q) return;

  try {
    const url = `https://nominatim.openstreetmap.org/search?format=json&addressdetails=1&limit=1&q=${encodeURIComponent(
      q
    )}`;

    const res = await fetch(url, { headers: { "Accept-Language": "en" } });
    const [place] = await res.json();

    if (!place) {
      alert("Could not find that area.");
      return;
    }

    focusAndSearch([parseFloat(place.lat), parseFloat(place.lon)]);
  } catch (err) {
    console.error("Search error:", err);
  }
});

// --- Focus map + load cafés (Overpass) ---------------------------

async function focusAndSearch([lat, lon]) {
  // Zoom into the selected area
  map.setView([lat, lon], 14);
  await loadCafes(lat, lon);
}

async function loadCafes(lat, lon) {
  const radiusMeters = 3000; // search radius

  const query = `
[out:json][timeout:25];
(
  node["amenity"="cafe"](around:${radiusMeters},${lat},${lon});
  way["amenity"="cafe"](around:${radiusMeters},${lat},${lon});
  relation["amenity"="cafe"](around:${radiusMeters},${lat},${lon});
);
out center 40;
`;

  cafeLayer.clearLayers();
  cafeListEl.innerHTML = `<li class="cafe-item"><span class="cafe-meta">Loading cafés…</span></li>`;

  try {
    const res = await fetch("https://overpass-api.de/api/interpreter", {
      method: "POST",
      headers: {
        "Content-Type":
          "application/x-www-form-urlencoded; charset=UTF-8",
      },
      body: "data=" + encodeURIComponent(query),
    });

    const data = await res.json();
    const elements = data.elements || [];

    cafeLayer.clearLayers();
    cafeListEl.innerHTML = "";

    if (!elements.length) {
      cafeListEl.innerHTML =
        '<li class="cafe-item"><span class="cafe-meta">No cafés found nearby.</span></li>';
      return;
    }

    elements.forEach((el) => {
      const center = el.type === "node" ? el : el.center;
      if (!center) return;

      const name =
        (el.tags && el.tags.name) || "Unnamed café";

      const marker = L.marker([center.lat, center.lon], {
      icon: coffeeIcon
      }).addTo(cafeLayer);

      marker.bindPopup(`<strong>${name}</strong>`);

      // Add to list
      const li = document.createElement("li");
      li.className = "cafe-item";
      li.innerHTML = `
        <span class="cafe-name">${name}</span>
      `;
      li.addEventListener("click", () => {
        map.setView([center.lat, center.lon], 17);
        marker.openPopup();
      });

      cafeListEl.appendChild(li);
    });
  } catch (err) {
    console.error("Overpass error:", err);
    cafeListEl.innerHTML =
      '<li class="cafe-item"><span class="cafe-meta">Error loading cafés. Try again in a moment.</span></li>';
  }
}

// Optional: highlight some cafés once at start (India default)
// (Comment out if you don’t want this.)
loadCafes(22.5937, 78.9629);
