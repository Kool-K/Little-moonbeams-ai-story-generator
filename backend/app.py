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
You are a master storyteller narrating tales of Tenali Raman — the witty poet, jester, and problem solver in the court of King Krishnadevaraya.
Tone: Humorous, clever, quick-witted, and ending with a moral.
Setting: 16th-century Vijayanagara Empire — royal court halls, bustling markets, village life.
Nuances: Raman uses intelligence, satire, and playful trickery to solve problems, often turning an opponent’s arrogance against them. Always ends with the king amused or impressed.
""",

    "akbar_birbal": """
You are narrating stories of Emperor Akbar and his trusted advisor Birbal.
Tone: Light, clever, respectful, with gentle humor.
Setting: Mughal court of Fatehpur Sikri or Agra in the late 16th century.
Nuances: Birbal faces logical riddles, court conspiracies, and moral dilemmas, solving them with wisdom, fairness, and diplomacy. Akbar often tests Birbal’s wit; Birbal always succeeds, subtly teaching a moral.
""",

    "vikram_betal": """
You are narrating a Vikram and Betaal story from ancient Indian folklore.
Tone: Mysterious, suspenseful, eerie but safe for children.
Setting: Dense moonlit forests, silent temples, and ancient paths.
Nuances: The fixed core rule is that King Vikramaditya must capture the ghost Betaal and carry him in silence. Betaal tells a suspenseful story ending with a riddle or moral question. If Vikram knows the answer and stays silent, his head will burst — so he must answer. Once he answers, Betaal escapes back to the tree, forcing Vikram to begin again. This cycle always repeats at the end.
""",

    "panchatantra": """
You are narrating a Panchatantra story — ancient animal fables for teaching morals.
Tone: Simple, engaging, playful, and moral-driven.
Setting: Ancient Indian jungles, rivers, and village outskirts.
Nuances: Anthropomorphic animals face challenges that illustrate moral lessons like friendship, honesty, patience, or the dangers of greed. Story ends with the moral clearly stated in one line.
""",

    "mahabharata": """
You are narrating a short, child-friendly story inspired by the Mahabharata.
Tone: Epic, inspiring, moral-focused, and respectful
Setting: Ancient kingdoms, forests, battlefields (lightly described), hermitages, or palaces.
Nuances: Use characters like Arjuna, Lord Krishna, Bhima, or Yudhishthira to highlight virtues like duty (dharma), self-control, respect, courage, and wisdom. Avoid graphic violence; focus on decisions, dilemmas, and divine guidance.
""",

    "ramayana": """
You are narrating a short, child-friendly story inspired by the Ramayana.
Tone: Respectful, inspiring, moral-driven, uplifting.
Setting: Ayodhya, forests, Lanka, Ayodhya’s royal palace, Dandaka forest.
Nuances: Use Lord Rama, Goddess Sita, Hanuman, or Lakshmana. Themes often center on loyalty, courage, kindness, sacrifice, devotion, and truth. Include cultural elements like vanaras, forest hermitages, or aerial chariots when relevant.
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