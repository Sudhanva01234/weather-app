AI Weather Planner

A full-stack weather web application built using Flask, OpenWeather API, Leaflet.js, and Groq AI.

The application allows users to search for weather by city or by clicking directly on a map. It also includes an AI-powered chatbot that provides contextual weather advice.

Features

Search weather by city name

Click on map to fetch weather by coordinates:

View current weather details

7-day forecast

Temperature, humidity, wind speed, and condition

AI chatbot for weather-based recommendations

Automatic synchronization between map, search, and chatbot

Clean responsive UI

Tech Stack

Backend:

Python

Flask

APIs:

OpenWeather API

Groq API 

Frontend:

HTML

CSS

JavaScript

Leaflet.js 

Version Control:

Git

Installation
1. Clone the repository
git clone 
cd weather-app

2. Create virtual environment (recommended)
python -m venv venv
venv\Scripts\activate

3. Install dependencies
python -m pip install -r requirements.txt

4. Create a .env file

Create a file named .env in the project root and add:

OPENWEATHER_API_KEY=your_openweather_api_key
GROQ_API_KEY=your_groq_api_key


DO NOT USE QUOTES.
DO NOT COMMIT THIS FILE.

5. Run the application
python app.py


Open:

http://127.0.0.1:5000

Project Structure
weather-app/
│
├── app.py
├── requirements.txt
├── README.md
├── .env
│
├── templates/
│   └── index.html
│
└── static/
    ├── style.css
    └── script.js

Notes

API keys are stored securely using environment variables.

The chatbot uses live weather context to generate responses.

The application is designed to be modular and easily extendable.

License

This project is for academic and learning purposes.
