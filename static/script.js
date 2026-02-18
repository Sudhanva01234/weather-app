const API_KEY = "YOUR_OPENWEATHER_API_KEY"; // Put your real key here

let storedWeatherData = null;

let map = L.map('map').setView([20.5937, 78.9629], 4);

// English Map Tiles
L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
    attribution: '&copy; OpenStreetMap & CartoDB'
}).addTo(map);

let marker;

// =======================
// MAP CLICK
// =======================
map.on('click', function(e) {

    const lat = e.latlng.lat;
    const lon = e.latlng.lng;

    setMarker(lat, lon);
    fetchWeather({ lat: lat, lon: lon });
});

function setMarker(lat, lon) {
    if (marker) map.removeLayer(marker);
    marker = L.marker([lat, lon]).addTo(map);
    map.setView([lat, lon], 8);
}

// =======================
// SEARCH CITY
// =======================
function searchCity() {
    const city = document.getElementById("cityInput").value.trim();
    if (!city) return;

    fetchWeather({ city: city });

    // Move map using geocoding
    fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.length > 0) {
                setMarker(data[0].lat, data[0].lon);
            }
        })
        .catch(err => console.error("Geocode error:", err));
}

// =======================
// ENTER KEY SUPPORT
// =======================
document.addEventListener("DOMContentLoaded", function () {

    const cityInput = document.getElementById("cityInput");
    const chatInput = document.getElementById("chatInput");

    if (cityInput) {
        cityInput.addEventListener("keypress", function(e){
            if (e.key === "Enter") searchCity();
        });
    }

    if (chatInput) {
        chatInput.addEventListener("keypress", function(e){
            if (e.key === "Enter") sendMessage();
        });
    }
});

// =======================
// FETCH WEATHER
// =======================
function fetchWeather(payload) {

    fetch("/weather", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify(payload)
    })
    .then(res => {
        if (!res.ok) throw new Error("Weather fetch failed");
        return res.json();
    })
    .then(data => {

        if (data.error) {
            alert("Location not found");
            return;
        }

        storedWeatherData = data;

        displayCurrentWeather(data.current);
        displayForecast(data.daily);

        autoScroll();
    })
    .catch(err => {
        console.error("Weather error:", err);
        alert("Unable to fetch weather.");
    });
}

// =======================
// DISPLAY CURRENT WEATHER
// =======================
function displayCurrentWeather(current) {

    document.getElementById("currentWeather").innerHTML = `
        <h2>${current.city}</h2>
        <div class="temp-glow">${current.temp}°C</div>
        <p>${current.description}</p>
        <p>Humidity: ${current.humidity}%</p>
        <p>Wind Speed: ${current.wind} m/s</p>
    `;
}

// =======================
// DISPLAY FORECAST
// =======================
function displayForecast(daily) {

    const forecastDiv = document.getElementById("forecast");
    forecastDiv.innerHTML = "";

    daily.forEach(day => {

        const parts = day.date.split("-");
        const formattedDate = `${parts[2]}/${parts[1]}/${parts[0]}`;

        forecastDiv.innerHTML += `
            <div class="forecast-card">
                <h4>${formattedDate}</h4>
                <p>${day.min}°C - ${day.max}°C</p>
                <p>Rain: ${day.rain}%</p>
            </div>
        `;
    });
}

// =======================
// AUTO SCROLL
// =======================
function autoScroll() {
    document.getElementById("currentWeather")
        .scrollIntoView({ behavior: "smooth" });
}

// =======================
// CHATBOT
// =======================
function toggleChat() {
    document.getElementById("chatBox").classList.toggle("hidden");
}

function sendMessage() {

    const input = document.getElementById("chatInput");
    const message = input.value.trim();
    if (!message) return;

    appendMessage("user", message);

    fetch("/chat", {
        method: "POST",
        headers: {"Content-Type": "application/json"},
        body: JSON.stringify({ message: message })
    })
    .then(res => {
        if (!res.ok) throw new Error("Chat failed");
        return res.json();
    })
    .then(data => {

        appendMessage("bot", data.reply);

        // 🔥 If backend says city changed → update map + weather
        if (data.city_update) {
            searchCityFromChat(data.city_update);
        }
    })
    .catch(err => {
        console.error("Chat error:", err);
        appendMessage("bot", "Something went wrong.");
    });

    input.value = "";
}

// =======================
// CHAT-BASED CITY UPDATE
// =======================
function searchCityFromChat(city) {

    fetchWeather({ city: city });

    fetch(`https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=1&appid=${API_KEY}`)
        .then(res => res.json())
        .then(data => {
            if (data && data.length > 0) {
                setMarker(data[0].lat, data[0].lon);
            }
        })
        .catch(err => console.error("Chat geocode error:", err));
}

// =======================
// CHAT UI MESSAGE
// =======================
function appendMessage(type, message) {

    const chatMessages = document.getElementById("chatMessages");

    const msgDiv = document.createElement("div");
    msgDiv.classList.add("message", type);

    msgDiv.innerText = message;

    chatMessages.appendChild(msgDiv);
    chatMessages.scrollTop = chatMessages.scrollHeight;
}
