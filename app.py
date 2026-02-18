import os
import requests
from flask import Flask, render_template, request, jsonify, session
from dotenv import load_dotenv
from groq import Groq

load_dotenv()

app = Flask(__name__)
app.secret_key = "supersecretkey"

# =========================
# API KEYS
# =========================
OPENWEATHER_API_KEY = os.getenv("OPENWEATHER_API_KEY")
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not OPENWEATHER_API_KEY:
    raise ValueError("OPENWEATHER_API_KEY not found in .env file.")

if not GROQ_API_KEY:
    raise ValueError("GROQ_API_KEY not found in .env file.")

client = Groq(api_key=GROQ_API_KEY)


@app.route("/")
def home():
    return render_template("index.html")


# =========================
# WEATHER ROUTE
# =========================
@app.route("/weather", methods=["POST"])
def weather():
    data = request.get_json()

    city = data.get("city")
    lat = data.get("lat")
    lon = data.get("lon")

    if city:
        current_url = f"https://api.openweathermap.org/data/2.5/weather?q={city}&units=metric&appid={OPENWEATHER_API_KEY}"
        forecast_url = f"https://api.openweathermap.org/data/2.5/forecast?q={city}&units=metric&appid={OPENWEATHER_API_KEY}"

    elif lat and lon:
        current_url = f"https://api.openweathermap.org/data/2.5/weather?lat={lat}&lon={lon}&units=metric&appid={OPENWEATHER_API_KEY}"
        forecast_url = f"https://api.openweathermap.org/data/2.5/forecast?lat={lat}&lon={lon}&units=metric&appid={OPENWEATHER_API_KEY}"

    else:
        return jsonify({"error": "City or coordinates required"}), 400

    current_response = requests.get(current_url)
    forecast_response = requests.get(forecast_url)

    if current_response.status_code != 200:
        return jsonify({"error": "Location not found"}), 400

    if forecast_response.status_code != 200:
        return jsonify({"error": "Forecast unavailable"}), 400

    current_data = current_response.json()
    forecast_data = forecast_response.json()

    # Store last searched city for chatbot
    session["last_city"] = current_data["name"]

    # Process 7-day forecast
    daily_summary = {}

    for entry in forecast_data["list"]:
        date = entry["dt_txt"].split(" ")[0]

        if date not in daily_summary:
            daily_summary[date] = {"temps": [], "rain": []}

        daily_summary[date]["temps"].append(entry["main"]["temp"])
        daily_summary[date]["rain"].append(entry.get("pop", 0))

    processed_daily = []

    for date, values in list(daily_summary.items())[:7]:
        processed_daily.append({
            "date": date,
            "min": round(min(values["temps"])),
            "max": round(max(values["temps"])),
            "rain": round(max(values["rain"]) * 100)
        })

    return jsonify({
        "current": {
            "city": current_data["name"],
            "temp": round(current_data["main"]["temp"]),
            "humidity": current_data["main"]["humidity"],
            "wind": round(current_data["wind"]["speed"], 2),
            "description": current_data["weather"][0]["description"]
        },
        "daily": processed_daily
    })


# =========================
# GROQ AI CHAT ROUTE
# =========================
@app.route("/chat", methods=["POST"])
def chat():
    data = request.get_json()
    message = data.get("message", "").strip().lower()

    last_city = session.get("last_city")

    if not last_city:
        return jsonify({"reply": "Please search for a city first."})

    # =========================
    # HARD WEATHER FILTER
    # =========================
    allowed_keywords = [
        "weather", "temperature", "rain", "humidity", "wind",
        "forecast", "climate", "hot", "cold", "storm", "snow",
        "heat", "umbrella", "jacket", "travel",
        "today", "tomorrow", "week", "sunny", "cloudy"
    ]

    if not any(word in message for word in allowed_keywords):
        return jsonify({
            "reply": "I can only help with weather-related questions."
        })

    # Fetch current weather for AI context
    current_url = f"https://api.openweathermap.org/data/2.5/weather?q={last_city}&units=metric&appid={OPENWEATHER_API_KEY}"
    response = requests.get(current_url)

    if response.status_code != 200:
        return jsonify({"reply": "City not found."})

    current_data = response.json()

    weather_context = f"""
City: {current_data['name']}
Temperature: {current_data['main']['temp']}°C
Humidity: {current_data['main']['humidity']}%
Wind Speed: {current_data['wind']['speed']} m/s
Condition: {current_data['weather'][0]['description']}
"""

    try:
        completion = client.chat.completions.create(
            model="llama-3.1-8b-instant",
            messages=[
                {
                    "role": "system",
                    "content": """
You are a strict weather assistant.
You ONLY answer questions related to weather,
temperature, rain, humidity, wind, forecasts,
clothing suggestions based on weather,
and travel advice based on weather.

If the question is not related to weather,
respond with:
"I can only help with weather-related questions."
"""
                },
                {
                    "role": "user",
                    "content": f"{weather_context}\n\nUser question: {message}"
                }
            ],
            temperature=0.5,
        )

        reply = completion.choices[0].message.content

        if not reply:
            raise Exception("Empty response from Groq")

    except Exception as e:
        print("FULL GROQ ERROR:", repr(e))
        reply = "AI service temporarily unavailable."

    return jsonify({"reply": reply})


if __name__ == "__main__":
    app.run(debug=True)
