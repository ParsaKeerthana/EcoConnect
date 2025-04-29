from flask import Flask, request, jsonify
from flask_cors import CORS
from openai import OpenAI
import os
from dotenv import load_dotenv

load_dotenv()

app = Flask(__name__)

CORS(app, resources={r"/api/*": {"origins": "https://app.econnectservices.tech"}}, supports_credentials=True)



client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

chat_history = [
    {
        "role": "system",
        "content": (
            "You are an expert in environmental science who can assist users with queries "
            "about climate change, sustainability, pollution, conservation, and green technology. "
            "Only answer questions if they are related to the environment. Politely decline to answer "
            "if a question is outside the environmental domain."
        )
    }
]

@app.route('/api/chat', methods=['POST'])
def chat():
    user_input = request.json.get("message", "")
    if not user_input:
        return jsonify({"reply": "Please provide a message."}), 400

    chat_history.append({"role": "user", "content": user_input})

    try:
        response = client.chat.completions.create(
            model="gpt-3.5-turbo",
            messages=chat_history
        )
        assistant_reply = response.choices[0].message.content.strip()
        chat_history.append({"role": "assistant", "content": assistant_reply})

        # Optional: Trim history to keep context manageable
        if len(chat_history) > 7:
            chat_history[:] = [chat_history[0]] + chat_history[-6:]

        return jsonify({"reply": assistant_reply})
    except Exception as e:
        print(f"❌ Error calling OpenAI: {e}")
        return jsonify({"reply": "OpenAI API error occurred."}), 500

if __name__ == "__main__":
    app.run(host='0.0.0.0', debug=True)
