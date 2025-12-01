import os
import logging
import json
from dotenv import load_dotenv
import google.generativeai as genai

# Load environment variables
load_dotenv()

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

def configure_genai():
    """
    Configures the global Gemini client.
    """
    api_key = os.getenv("GEMINI_API_KEY") or os.getenv("GOOGLE_API_KEY")

    if not api_key:
        logger.error("❌ No API key found. Please set GEMINI_API_KEY.")
        return False

    try:
        # Standard SDK Configuration
        genai.configure(api_key=api_key)
        return True
    except Exception as e:
        logger.error(f"❌ Configuration failed: {e}")
        return False

def generate_summary_with_gemini(prompt: str) -> str:
    """
    Generate a summary using Gemini 1.5 Flash.
    """
    if not configure_genai():
        return "Error: API Key configuration failed."

    try:
        # Initialize the model (Standard SDK)
        # 'gemini-2.5-flash' is the safest, most widely available alias
        model = genai.GenerativeModel('gemini-2.5-flash')

        # Generate content
        response = model.generate_content(
            prompt,
            generation_config=genai.types.GenerationConfig(
                temperature=0.7,
                max_output_tokens=500
            )
        )

        # Extract text safely
        if response.text:
            return response.text.strip()
        else:
            return "Error: Empty response (Safety filter may have blocked content)."

    except Exception as e:
        logger.error(f"❌ Gemini API Call Failed: {e}")
        
        # specific handling for the 404 error if it persists
        if "404" in str(e):
            return "Error: Model not found. Check out if your API Key supports Gemini 2.5 Flash."
            
        return f"Error processing request: {str(e)}"

# --- Test Block with your Data ---
if __name__ == "__main__":
    # Simulate the data you provided in the prompt
    data_context = {
        "summary_request": "Analyze this real estate data for Wakad, Pune.",
        "table": [
            {"year": 2022, "flat_rate": 9734, "total_sold": 6944},
            {"year": 2023, "flat_rate": 9959, "total_sold": 5484},
            {"year": 2024, "flat_rate": 10277, "total_sold": 3760}
        ]
    }
    
    # Convert dict to string for the prompt
    prompt_str = f"Summarize the trends in this data: {json.dumps(data_context)}"
    
    print("Sending request to Gemini...")
    result = generate_summary_with_gemini(prompt_str)
    print("\n--- Result ---")
    print(result)