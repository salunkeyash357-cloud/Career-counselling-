"""
=====================================================================
  app.py – Flask Application Entry Point
  Agentic Career Counseling Companion
  IBM watsonx.ai · Granite Models
=====================================================================
"""

import os
import json
import logging
from datetime import datetime

from flask import Flask, request, jsonify, render_template, session
from flask_cors import CORS
from dotenv import load_dotenv

load_dotenv()

# ── App setup ─────────────────────────────────────────────────────────────────
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", "dev-secret-change-me")
CORS(app)

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s  %(levelname)-8s  %(name)s  %(message)s",
)
logger = logging.getLogger(__name__)

# ── Import agent modules ──────────────────────────────────────────────────────
from agent.career_agent import (
    generate_response,
    analyze_skills,
    generate_roadmap,
    suggest_courses,
    improve_resume,
    assess_career_fit,
)
from agent.instructions import SYSTEM_PROMPT, build_career_prompt

# ── Session helpers ───────────────────────────────────────────────────────────

def get_profile() -> dict:
    return session.get("student_profile", {})


def get_history() -> list:
    return session.get("conversation_history", [])


def save_history(history: list):
    session["conversation_history"] = history[-20:]  # keep last 20 messages


# ═══════════════════════════════════════════════════════════════════════════════
#  ROUTES – Pages
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/")
def index():
    return render_template("index.html")


@app.route("/dashboard")
def dashboard():
    return render_template("dashboard.html", profile=get_profile())


@app.route("/assessment")
def assessment():
    return render_template("assessment.html")


@app.route("/chatbot")
def chatbot():
    return render_template("chatbot.html", profile=get_profile())


@app.route("/roadmap")
def roadmap():
    return render_template("roadmap.html", profile=get_profile())


# ═══════════════════════════════════════════════════════════════════════════════
#  API ROUTES – JSON
# ═══════════════════════════════════════════════════════════════════════════════

@app.route("/api/profile", methods=["POST"])
def save_profile():
    """Save/update student profile to session."""
    data = request.get_json(silent=True) or {}
    profile = {
        "name": data.get("name", ""),
        "email": data.get("email", ""),
        "education": data.get("education", ""),
        "gpa": data.get("gpa", ""),
        "skills": data.get("skills", []),
        "interests": data.get("interests", []),
        "goals": data.get("goals", ""),
        "experience": data.get("experience", ""),
        "personality": data.get("personality", ""),
        "timeline": data.get("timeline", ""),
        "hours_per_week": data.get("hours_per_week", "10"),
        "updated_at": datetime.utcnow().isoformat(),
    }
    session["student_profile"] = profile
    logger.info("Profile saved for: %s", profile.get("name"))
    return jsonify({"status": "ok", "profile": profile})


@app.route("/api/profile", methods=["GET"])
def get_profile_api():
    return jsonify(get_profile())


@app.route("/api/chat", methods=["POST"])
def chat():
    """Main chatbot endpoint – conversational career counseling."""
    data = request.get_json(silent=True) or {}
    user_message = (data.get("message") or "").strip()
    if not user_message:
        return jsonify({"error": "Message cannot be empty."}), 400

    profile = get_profile()
    history = get_history()

    # Build context-rich prompt
    full_prompt = build_career_prompt(user_message, profile, history)
    ai_response = generate_response(full_prompt, SYSTEM_PROMPT)

    # Persist conversation
    history.append({"role": "user", "content": user_message, "timestamp": datetime.utcnow().isoformat()})
    history.append({"role": "assistant", "content": ai_response, "timestamp": datetime.utcnow().isoformat()})
    save_history(history)

    return jsonify({
        "response": ai_response,
        "timestamp": datetime.utcnow().isoformat(),
    })


@app.route("/api/assess", methods=["POST"])
def assess():
    """Full career assessment based on the student's saved profile."""
    data = request.get_json(silent=True) or {}
    profile = {**get_profile(), **data}  # merge saved + submitted
    if not profile:
        return jsonify({"error": "Please complete your profile first."}), 400

    result = assess_career_fit(profile)
    return jsonify({"assessment": result})


@app.route("/api/skill-gap", methods=["POST"])
def skill_gap():
    """Skill gap analysis for a specific career target."""
    data = request.get_json(silent=True) or {}
    skills = data.get("skills") or get_profile().get("skills", [])
    target = data.get("target_career", "Software Engineer")

    if isinstance(skills, str):
        skills = [s.strip() for s in skills.split(",") if s.strip()]

    result = analyze_skills(skills, target)
    return jsonify({"analysis": result})


@app.route("/api/roadmap", methods=["POST"])
def career_roadmap():
    """Generate a personalised career roadmap."""
    data = request.get_json(silent=True) or {}
    profile = {**get_profile(), **data}
    career = data.get("career", profile.get("goals", "Software Engineer"))

    result = generate_roadmap(profile, career)
    return jsonify({"roadmap": result})


@app.route("/api/courses", methods=["POST"])
def courses():
    """Suggest courses for a career path."""
    data = request.get_json(silent=True) or {}
    skills = data.get("skills") or get_profile().get("skills", [])
    career = data.get("career", "Software Engineer")
    budget = data.get("budget", "free")

    if isinstance(skills, str):
        skills = [s.strip() for s in skills.split(",") if s.strip()]

    result = suggest_courses(skills, career, budget)
    return jsonify({"courses": result})


@app.route("/api/resume", methods=["POST"])
def resume_review():
    """Resume improvement analysis."""
    data = request.get_json(silent=True) or {}
    resume_text = (data.get("resume_text") or "").strip()
    target_role = data.get("target_role", "Software Engineer")

    if not resume_text:
        return jsonify({"error": "Resume text is required."}), 400

    result = improve_resume(resume_text, target_role)
    return jsonify({"review": result})


@app.route("/api/history", methods=["GET"])
def conversation_history():
    return jsonify(get_history())


@app.route("/api/history", methods=["DELETE"])
def clear_history():
    session.pop("conversation_history", None)
    return jsonify({"status": "cleared"})


@app.route("/api/health", methods=["GET"])
def health():
    """Health check – also verifies watsonx.ai connectivity."""
    from agent.career_agent import _get_client
    try:
        client = _get_client()
        connected = client is not None
    except Exception:
        connected = False
    return jsonify({
        "status": "ok",
        "watsonx_connected": connected,
        "model": os.getenv("GRANITE_MODEL_ID", "meta-llama/llama-3-3-70b-instruct"),
        "timestamp": datetime.utcnow().isoformat(),
    })


# ═══════════════════════════════════════════════════════════════════════════════
#  Entry point
# ═══════════════════════════════════════════════════════════════════════════════

if __name__ == "__main__":
    port = int(os.getenv("PORT", 5000))
    debug = os.getenv("FLASK_ENV", "development") == "development"
    logger.info("CareerGuide AI starting on http://localhost:%d", port)
    app.run(host="0.0.0.0", port=port, debug=debug)
