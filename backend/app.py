# ==============================================================================
# Final app.py for Little Moonbeams (v4 - with Smart Moral Handling)
# This file includes all fixes and features.
# - NEW: Upgraded prompt to intelligently handle negative but teachable morals.
# ==============================================================================

import os
import json
from flask import Flask, request, jsonify
from flask_cors import CORS
import google.generativeai as genai

# --- 1. Initialization and Configuration ---
app = Flask(__name__)
CORS(app)

try:
    genai.configure(api_key=os.getenv("GEMINI_API_KEY"))
except Exception as e:
    print(f"Error configuring Gemini API: {e}")
    print("Please ensure your GEMINI_API_KEY is set in a .env file.")


# --- 2. Story Contexts Dictionary ---
STORY_CONTEXTS = {
    "tenali_raman": """
You are a master storyteller narrating tales of Tenali Raman — the witty poet in the court of King Krishnadevaraya.
Tone: Humorous, clever, and with a moral.
Setting: 16th-century Vijayanagara court.
Nuances: Raman uses intelligence and wordplay to solve problems.
""",
    "akbar_birbal": """
You are narrating stories of Akbar and Birbal.
Tone: Light, clever, filled with gentle humor.
Setting: Mughal court in 16th-century India.
Nuances: Birbal solves puzzles and moral dilemmas using logic and intelligence.
""",
    "vikram_betal": """
You are narrating a Vikram and Betaal story.
Tone: Mysterious, slightly eerie but child-friendly.
Setting: Ancient India, deep forests, moonlit nights.
Nuances: Betaal tells a suspenseful story to King Vikramaditya, ending with a riddle related to the story's moral. You must include this riddle at the end.
""",
    "panchatantra": """
You are narrating a Panchatantra story.
Tone: Simple, engaging, and animal-centric.
Setting: Ancient Indian jungles and villages.
Nuances: The main characters are animals with human-like qualities who face moral dilemmas.
""",
    "mahabharata": """
You are narrating a short, child-friendly story inspired by the Mahabharata.
Tone: Epic, moral-driven, respectful.
Setting: Ancient kingdoms, forests, or palaces.
Nuances: Use characters like Arjuna, Krishna, or the Pandavas. Focus on wisdom and duty, avoiding complex violence.
""",
    "ramayana": """
You are narrating a short, child-friendly story inspired by the Ramayana.
Tone: Respectful, inspiring, and moral-driven.
Setting: Ayodhya, forests, Lanka.
Nuances: Use characters like Rama, Sita, Hanuman, or Lakshmana. Focus on loyalty, courage, and kindness.
"""
}


# --- 3. API Routes ---
@app.route("/")
def home():
    return "<h1>Little Moonbeams Backend is Running!</h1>"


@app.route("/generate_story", methods=["POST"])
def generate_story():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request: No JSON data received"}), 400

    category_name = data.get("storyType")
    moral_word = data.get("moral")
    duration = data.get("duration", 0)

    if not category_name or not moral_word:
        return jsonify({"error": "Missing storyType or moral"}), 400

    formatted_category = category_name.lower().replace(' & ', '_').replace(' ', '_')

    if formatted_category not in STORY_CONTEXTS:
        return jsonify({"error": f"Invalid story category: {category_name}"}), 400

    length_instruction = "The story should be approximately 3-4 paragraphs long."
    if duration > 0:
        word_count = duration * 150
        length_instruction = f"The story MUST be long enough to be read aloud in approximately {duration} minutes. Aim for a word count of around {word_count} words."

    # --- THIS IS THE NEW, SMARTER PROMPT ---
    full_prompt = f"""
{STORY_CONTEXTS[formatted_category]}

**Your Strict Instructions:**
1.  You are a safe, gentle storyteller for children aged 4-8. Your primary goal is to produce harmless, positive content.
2.  **Ensure Variety:** Every story you generate MUST be unique. Even for the same moral, create a new story with different characters or scenarios. Do NOT repeat stories.
3.  **Moral Handling (Very Important):**
    - If the user's moral theme ('{moral_word}') is a negative but teachable concept (like 'anger', 'greed', 'jealousy', 'lying', 'sadness'), do NOT ignore it. Instead, create a story where a character learns a positive lesson about that theme. For example, for 'anger', tell a story about why it's important to control one's temper. For 'greed', show why sharing is better. The story's conclusion should be constructive and empowering for a child.
    - If the user's moral theme is truly inappropriate, unsafe, hateful, or violent, you MUST IGNORE the user's word and write a positive story about 'kindness' or 'friendship' instead.
4.  {length_instruction}
5.  **Final Output Format:** Your entire response MUST be a single, valid JSON object. It must have two keys: "title" (a creative title for the story) and "text" (the full story text).

**User's Moral Theme:** "{moral_word}"

**Example Response Format:**
{{
  "title": "Birbal and the Honest Farmer",
  "text": "Once upon a time, in the grand court of Emperor Akbar..."
}}
"""

    try:
        model = genai.GenerativeModel("gemini-1.5-flash")
        response = model.generate_content(full_prompt)
        clean_json_string = response.text.replace("```json", "").replace("```", "").strip()
        story_data = json.loads(clean_json_string)
        return jsonify(story_data)
    except Exception as e:
        print(f"An error occurred during API call or JSON parsing: {e}")
        print(f"AI's raw response was: {response.text if 'response' in locals() else 'No response'}")
        return jsonify({"error": "Failed to generate story from the AI. Check backend logs."}), 500


# --- 4. Run the App ---
if __name__ == "__main__":
    app.run(debug=True, port=5000)