"""
File: tts_engine.py
Purpose: Multilingual Text-to-Speech (TTS) engine for rural farmers supporting Marathi (mr),
         Hindi (hi), and English (en). Converts recommendation summaries into voice audio (using gTTS
         or graceful static localized speech templates with base64 audio fallback).
Inputs:  mandi_name (str), crop_name (str), net_price (float), language (str: 'en'|'hi'|'mr')
Outputs: dict with text, spoken_script, language, audio_base64 (if generated), and audio_url
Usage:   from services.tts_engine import generate_speech
         speech_data = generate_speech("Amravati", "Cotton", 7134.0, language="mr")
"""

import io
import base64

# Localized clean crop name extractors
def clean_crop_name(raw_name, lang="en"):
    """Extracts language-appropriate crop name."""
    if not raw_name:
        return "Crop"
    if "(" in raw_name and ")" in raw_name:
        parts = raw_name.split("(")
        eng = parts[0].strip()
        regional = parts[1].replace(")", "").strip()
        if lang == "en":
            return eng
        elif lang == "hi":
            # Hindi is usually the first part of regional (e.g. 'कपास / कापूस' -> 'कपास')
            subparts = regional.split("/")
            return subparts[0].strip()
        elif lang == "mr":
            subparts = regional.split("/")
            return subparts[-1].strip()
    return raw_name

def clean_mandi_name(raw_name, lang="en"):
    """Extracts language-appropriate mandi name."""
    if not raw_name:
        return "Mandi"
    if "(" in raw_name and ")" in raw_name:
        parts = raw_name.split("(")
        eng = parts[0].strip()
        regional = parts[1].replace(")", "").strip()
        if lang == "en":
            return eng
        return regional
    return raw_name

def get_speech_script(mandi_name, crop_name, net_price, language="en", advisory_decision=None, advisory_gain=0.0, advisory_days=7, advisory_text=None, loss_avoided=0.0, forecast_price=None, storage_cost=None):
    """
    Generates natural language script in chosen language, prepending AI Sell vs. Hold decision
    with actionable reasons and profit/loss avoided metrics before champion recommendation.
    """
    clean_crop = clean_crop_name(crop_name, language)
    clean_mandi = clean_mandi_name(mandi_name, language)
    price_val = int(round(float(net_price)))
    gain_val = int(round(float(advisory_gain)))
    loss_val = int(round(float(loss_avoided))) if loss_avoided else int(round(abs(float(advisory_gain))))

    advisory_prefix = ""
    if advisory_text:
        advisory_prefix = advisory_text.strip() + " "
    elif advisory_decision:
        dec = str(advisory_decision).upper()
        if dec == "HOLD":
            if language == "mr":
                advisory_prefix = f"कृषिमित्र सल्ला: माल {advisory_days} दिवस थांबवून ठेवा. कारण: बाजारभाव वाढण्याचा अंदाज असून साठवणूक खर्च वजा जाता प्रति क्विंटल अंदाजे {gain_val} रुपये जास्त निव्वळ नफा मिळेल. "
            elif language == "hi":
                advisory_prefix = f"कृषिमित्र सलाह: उपज {advisory_days} दिन रोककर रखें। कारण: मंडी भाव बढ़ने की उम्मीद है और भंडारण खर्च काटकर प्रति क्विंटल लगभग {gain_val} रुपये का अतिरिक्त शुद्ध मुनाफा होगा। "
            else:
                advisory_prefix = f"KrishiMitra Advisory: Hold your produce for {advisory_days} days. Reason: Prices are forecasted to rise, giving you an estimated net profit gain of {gain_val} rupees per quintal after storage deductions. "
        elif dec == "SELL":
            if language == "mr":
                loss_clause = f" आणि थांबल्यास होणारे प्रति क्विंटल {loss_val} रुपयांचे नुकसान टळेल" if loss_val > 0 else ""
            elif language == "hi":
                loss_clause = f" और रुकने पर होने वाले प्रति क्विंटल {loss_val} रुपये के नुकसान से बचाव होगा" if loss_val > 0 else ""
            else:
                loss_clause = f" and protects you from a potential loss of {loss_val} rupees per quintal" if loss_val > 0 else ""

            if language == "mr":
                advisory_prefix = f"कृषिमित्र सल्ला: आजच माल विका. कारण: पुढील काळात भाव स्थिर किंवा कमी राहण्याचा अंदाज आहे. आज विक्री केल्यास सर्वोत्तम परतावा मिळेल{loss_clause}. "
            elif language == "hi":
                advisory_prefix = f"कृषिमित्र सलाह: आज ही फसल बेचें। कारण: आगे भाव गिरने या स्थिर रहने का अनुमान है। आज बेचने पर सबसे अच्छा भाव मिलेगा{loss_clause}। "
            else:
                advisory_prefix = f"KrishiMitra Advisory: Sell your produce today. Reason: Future prices are predicted to remain flat or drop. Selling now locks in your best return{loss_clause}. "

    if language == "mr":
        mandi_script = f"तुमच्या {clean_crop}साठी सर्वात उत्तम मंडी {clean_mandi} आहे. येथे सर्व वाहतूक आणि खर्च वजा करून निव्वळ नफा {price_val} रुपये प्रति क्विंटल मिळेल."
    elif language == "hi":
        mandi_script = f"आपकी {clean_crop} के लिए सबसे अच्छी मंडी {clean_mandi} है। यहाँ सभी परिवहन और खर्चे काटकर शुद्ध भाव {price_val} रुपये प्रति क्विंटल मिलेगा।"
    else:
        mandi_script = f"The best mandi for your {clean_crop} is {clean_mandi}, with a net price of {price_val} rupees per quintal after deducting all transport and mandi costs."

    return (advisory_prefix + mandi_script).strip()

def generate_speech(mandi_name, crop_name, net_price, language="en", advisory_decision=None, advisory_gain=0.0, advisory_days=7, advisory_text=None, loss_avoided=0.0, forecast_price=None, storage_cost=None):
    """
    Synthesizes speech script into audio with prepended AI advisory decision.

    Parameters:
        mandi_name (str): Name of winning mandi
        crop_name (str): Name of crop
        net_price (float): Realized net price in INR
        language (str): Language code ('en', 'hi', 'mr')
        advisory_decision (str, optional): 'HOLD' | 'SELL' | 'UNAVAILABLE'
        advisory_gain (float, optional): Projected gain in INR/qtl
        advisory_days (int, optional): Horizon in days
        advisory_text (str, optional): Custom localized advisory text
        loss_avoided (float, optional): Loss avoided in INR/qtl
        forecast_price (float, optional): Forecast listing price in INR
        storage_cost (float, optional): Storage cost in INR/qtl

    Returns:
        dict: Audio metadata, localized text script, and base64 audio data
    """
    lang_code = language.lower()
    if lang_code not in ("en", "hi", "mr"):
        lang_code = "en"

    # Map language codes to gTTS supported codes
    gtts_lang = {
        "en": "en",
        "hi": "hi",
        "mr": "mr"
    }.get(lang_code, "en")

    script = get_speech_script(
        mandi_name=mandi_name,
        crop_name=crop_name,
        net_price=net_price,
        language=lang_code,
        advisory_decision=advisory_decision,
        advisory_gain=advisory_gain,
        advisory_days=advisory_days,
        advisory_text=advisory_text,
        loss_avoided=loss_avoided,
        forecast_price=forecast_price,
        storage_cost=storage_cost
    )
    audio_base64 = None
    audio_format = "mp3"
    tts_engine_used = "none"

    # Attempt online gTTS synthesis
    try:
        from gtts import gTTS
        fp = io.BytesIO()
        tts = gTTS(text=script, lang=gtts_lang, slow=False)
        tts.write_to_fp(fp)
        fp.seek(0)
        audio_base64 = base64.b64encode(fp.read()).decode("utf-8")
        tts_engine_used = "gTTS"
    except Exception as e:
        # Fallback gracefully if gTTS or network is unavailable
        tts_engine_used = f"browser_tts_fallback ({str(e)[:30]})"

    return {
        "status": "success",
        "language": lang_code,
        "script": script,
        "tts_engine": tts_engine_used,
        "audio_base64": audio_base64,
        "audio_mime": f"audio/{audio_format}" if audio_base64 else None
    }

if __name__ == "__main__":
    test_res = generate_speech("Amravati (अमरावती)", "Cotton (कपास / कापूस)", 7134, language="mr")
    print(f"TTS generated for Marathi:\n{test_res['script']}")
