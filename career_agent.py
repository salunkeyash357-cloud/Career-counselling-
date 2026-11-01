"""
Career Counseling Agent – IBM watsonx.ai Granite Integration
Handles all AI inference calls, session state, and agentic logic.
"""

import os
import logging
from typing import Optional
from dotenv import load_dotenv

load_dotenv()

logger = logging.getLogger(__name__)

# ── watsonx.ai client (lazy-initialised once) ─────────────────────────────────
_watsonx_client = None


def _get_client():
    global _watsonx_client
    if _watsonx_client is not None:
        return _watsonx_client

    try:
        from ibm_watsonx_ai import APIClient, Credentials
        api_key = os.getenv("IBM_API_KEY")
        url = os.getenv("WATSONX_URL", "https://us-south.ml.cloud.ibm.com")
        if not api_key:
            raise ValueError("IBM_API_KEY not set in environment")
        credentials = Credentials(url=url, api_key=api_key)
        _watsonx_client = APIClient(credentials)
        logger.info("watsonx.ai APIClient initialised successfully.")
    except Exception as exc:
        logger.error("Failed to initialise watsonx.ai client: %s", exc)
        _watsonx_client = None
    return _watsonx_client


# ── Core inference function ───────────────────────────────────────────────────

def generate_response(
    prompt: str,
    system_prompt: str,
    max_tokens: int = 1200,
    temperature: float = 0.7,
) -> str:
    """
    Call the Granite model on watsonx.ai and return the generated text.
    Falls back to a helpful offline message if the API is unavailable.
    """
    project_id = os.getenv("WATSONX_PROJECT_ID")
    model_id = os.getenv("GRANITE_MODEL_ID", "ibm/granite-13b-chat-v2")

    client = _get_client()
    if client is None:
        return _offline_fallback(prompt)

    try:
        from ibm_watsonx_ai.foundation_models import ModelInference
        from ibm_watsonx_ai.metanames import GenTextParamsMetaNames as Params

        model = ModelInference(
            model_id=model_id,
            api_client=client,
            project_id=project_id,
            params={
                Params.MAX_NEW_TOKENS: max_tokens,
                Params.TEMPERATURE: temperature,
                Params.TOP_P: 0.9,
                Params.TOP_K: 50,
                Params.REPETITION_PENALTY: 1.1,
                Params.STOP_SEQUENCES: ["Student:", "Human:"],
            },
        )

        full_prompt = f"<|system|>\n{system_prompt}\n<|user|>\n{prompt}\n<|assistant|>\n"
        response = model.generate_text(prompt=full_prompt)
        return response.strip() if response else "I could not generate a response. Please try again."

    except Exception as exc:
        logger.error("Granite inference error: %s", exc)
        return _offline_fallback(prompt)


# ── Specialised agent tasks ───────────────────────────────────────────────────

def analyze_skills(skills: list, target_career: str) -> str:
    from agent.instructions import SYSTEM_PROMPT
    prompt = f"""Perform a detailed skill gap analysis for a student who wants to become a {target_career}.

Current Skills: {', '.join(skills) if skills else 'None provided'}

Please provide:
1. **Skill Gap Analysis Table** (Skill | Current Level | Required Level | Gap | Priority)
2. **Critical Skills to Acquire First** (top 5, with reasons)
3. **Recommended Learning Resources** for each critical skill
4. **Estimated Time to Bridge the Gap** (realistic timeline)
5. **Quick Wins** – skills they can learn in < 2 weeks

Format with Markdown tables and bullet points."""
    return generate_response(prompt, SYSTEM_PROMPT, max_tokens=1500)


def generate_roadmap(profile: dict, career: str) -> str:
    from agent.instructions import SYSTEM_PROMPT
    prompt = f"""Create a comprehensive career roadmap for a student targeting: {career}

Student Background:
- Education: {profile.get('education', 'Not specified')}
- Current Skills: {', '.join(profile.get('skills', [])) or 'Not listed'}
- GPA: {profile.get('gpa', 'Not specified')}
- Available Time per Week: {profile.get('hours_per_week', '10-15 hours')}

Generate a roadmap with three phases:

**PHASE 1 – Foundation (Months 1–6)**
**PHASE 2 – Build & Practice (Months 7–12)**
**PHASE 3 – Launch & Specialise (Year 2–3)**

For each phase include:
- Key milestones
- Courses / certifications (with links when possible)
- Projects to build for portfolio
- Communities to join
- Expected outcomes

Format as a timeline table plus bullet-point details."""
    return generate_response(prompt, SYSTEM_PROMPT, max_tokens=1800)


def suggest_courses(skills: list, career: str, budget: str = "free") -> str:
    from agent.instructions import SYSTEM_PROMPT
    prompt = f"""Recommend the best courses and certifications for a student targeting {career}.

Current Skills: {', '.join(skills) if skills else 'Beginner'}
Budget Preference: {budget}

Provide recommendations from:
1. **IBM SkillsBuild** (free tier – prioritise these)
2. **Coursera** (free audit options)
3. **edX** (free audit options)
4. **YouTube / Free Resources**
5. **GitHub Repositories to Study**

For each course provide: Course Name | Platform | Duration | Cost | Difficulty | Why It Matters

Also list the top 3 IBM certifications most valued by recruiters for this role."""
    return generate_response(prompt, SYSTEM_PROMPT, max_tokens=1400)


def improve_resume(resume_text: str, target_role: str) -> str:
    from agent.instructions import SYSTEM_PROMPT
    prompt = f"""Analyze and improve this resume for a {target_role} position.

RESUME CONTENT:
{resume_text}

Provide:
1. **Overall Score** (out of 10) with justification
2. **ATS Keyword Analysis** – missing keywords for {target_role}
3. **Section-by-Section Feedback** (Summary, Experience, Skills, Education, Projects)
4. **Top 5 Immediate Improvements** (most impactful changes)
5. **Quantified Achievement Examples** – rewrite 3 bullet points using Action + Result + Impact
6. **Missing Sections** to add
7. **ATS-Optimised Summary** paragraph (write a new one)

Be specific and actionable."""
    return generate_response(prompt, SYSTEM_PROMPT, max_tokens=1600)


def assess_career_fit(profile: dict) -> str:
    from agent.instructions import SYSTEM_PROMPT
    skills_str = ', '.join(profile.get('skills', [])) or 'Not specified'
    interests_str = ', '.join(profile.get('interests', [])) or 'Not specified'
    prompt = f"""Perform a comprehensive career assessment for this student:

**Profile:**
- Name: {profile.get('name', 'Student')}
- Education: {profile.get('education', 'Not specified')}
- GPA / Percentage: {profile.get('gpa', 'Not specified')}
- Technical Skills: {skills_str}
- Interests & Passions: {interests_str}
- Career Goals: {profile.get('goals', 'Not specified')}
- Work Experience: {profile.get('experience', 'None')}
- Personality: {profile.get('personality', 'Not specified')}

Provide:
1. **Top 5 Recommended Career Paths** with match percentage (scored by skills × interests × market demand)
2. **Why Each Career Fits** – 2-3 sentences per path
3. **Your Natural Strengths** – what this profile excels at
4. **1 Stretch Goal Career** – ambitious but achievable in 3 years
5. **Immediate Next Step** – single most important action to take this week

Use emojis for career icons. End with a personalised motivational message."""
    return generate_response(prompt, SYSTEM_PROMPT, max_tokens=1600)


# ── Fallback (when API unavailable) ──────────────────────────────────────────

def _offline_fallback(prompt: str) -> str:
    return """⚠️ **IBM watsonx.ai API Unavailable**

I'm currently unable to connect to the IBM Granite model. This could be because:
- Your `IBM_API_KEY` or `WATSONX_PROJECT_ID` is not configured in the `.env` file
- The watsonx.ai service is temporarily unavailable
- Network connectivity issues

**To fix this:**
1. Copy `.env.example` to `.env`
2. Add your IBM Cloud API Key from [IBM Cloud IAM](https://cloud.ibm.com/iam/apikeys)
3. Add your watsonx.ai Project ID from your [watsonx.ai project settings](https://dataplatform.cloud.ibm.com)
4. Restart the Flask server

**While you wait**, here are general career counseling resources:
- 🎓 [IBM SkillsBuild](https://skillsbuild.org) – Free tech courses
- 📚 [Coursera](https://coursera.org) – University-grade courses (free audit)
- 💼 [LinkedIn Learning](https://linkedin.com/learning) – Professional skills
- 🤖 [IBM watsonx.ai](https://www.ibm.com/watsonx) – AI platform

*CareerGuide AI will be fully operational once credentials are configured.*"""
