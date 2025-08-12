# Little Moonbeams ✨

### _stories before starlight_

## 📖 About The Project

Little Moonbeams is a magical bedtime story generator designed to create unique, gentle, and personalized tales for children. By combining a moral or theme provided by the user with a rich universe from classic Indian folklore, Little Moonbeams uses the power of AI to craft a brand new story every time.

With a dreamy, night-sky interface, a built-in sleep timer, and a choice of narration voices, this application aims to make bedtime a calm, creative, and cherished ritual for families.

---

## ✨ Key Features

* **AI-Powered Story Generation:** Leverages the Gemini 1.5 Flash model to create unique, age-appropriate stories on demand.
* **Rich Story Universes:** Choose from 6 beloved worlds of Indian folklore:
    * Tenali Raman
    * Akbar & Birbal
    * Vikram & Betal
    * Panchatantra
    * Mahabharata
    * Ramayana
* **Moral-Based Storytelling:** Enter any theme (e.g., "kindness," "courage," "anger") and the AI will intelligently craft a story with a positive lesson.
* **Customizable Narration:** Select from a list of available browser voices (including Indian English and Hindi) for authentic pronunciation.
* **Sleep Timer:** Set a timer to automatically fade the screen to black, helping children wind down for sleep.
* **Premium & Responsive UI:** A beautiful, dark-themed interface that looks great on any device, from phones to desktops.

---

## 🛠️ Tech Stack

This project is built with a modern, lightweight stack, keeping the frontend simple and the backend powerful.

* **Frontend:**
    * HTML5
    * CSS3 (Custom Properties, Grid Layout)
    * Vanilla JavaScript (ES6+)
* **Backend:**
    * Python 3
    * Flask (as the web server)
    * Google Generative AI API (for story generation)
* **Deployment:**
    * Frontend hosted on GitHub Pages.
    * Backend hosted on Render.

---

## 🚀 Getting Started

To get a local copy up and running, follow these simple steps.

### Prerequisites

* Python 3.x installed on your machine.
* A Google Gemini API key. You can get one from [Google AI Studio](https://aistudio.google.com/app/apikey).

### Installation & Setup

1.  **Clone the repository:**
    ```sh
    git clone [https://github.com/your-username/little-moonbeams-ai-story-generator.git](https://github.com/your-username/little-moonbeams-ai-story-generator.git)
    cd little-moonbeams-ai-story-generator
    ```

2.  **Set up the Backend:**
    * Navigate to the `backend` directory:
        ```sh
        cd backend
        ```
    * Create and activate a Python virtual environment:
        ```sh
        # For Windows
        python -m venv venv
        .\venv\Scripts\activate

        # For macOS/Linux
        python3 -m venv venv
        source venv/bin/activate
        ```
    * Install the required packages:
        ```sh
        pip install -r requirements.txt
        ```
        *(Note: If you don't have a `requirements.txt` file, you can create one with `pip freeze > requirements.txt` after installing the packages below.)*
        ```sh
        pip install Flask Flask-Cors google-generativeai python-dotenv
        ```
    * Create a `.env` file in the `backend` directory and add your API key:
        ```
        GEMINI_API_KEY="YOUR_API_KEY_HERE"
        ```

3.  **Run the Backend Server:**
    * While in the `backend` directory with your virtual environment active, run:
        ```sh
        flask run
        ```
    * The server will start on `http://localhost:5000`.

4.  **Launch the Frontend:**
    * Navigate back to the root project directory.
    * Open the `index.html` file directly in your web browser.

The application should now be fully functional on your local machine!
