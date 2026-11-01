# 🤖 CareerGuide AI – Agentic Career Counseling Companion

> **AI-powered career counselor built with Python Flask + IBM watsonx.ai (Granite models)**  
> IBM Cloud Lite · Bootstrap 5 · Dark Mode · Mobile Responsive

---

## 🌟 Features

| Feature | Description |
|---|---|
| 🎯 **Career Assessment** | 5-step multi-factor AI career analysis |
| 💬 **AI Chat** | Conversational IBM Granite-powered counselor |
| 📊 **Skill Gap Analysis** | Priority-ranked gap identification with resources |
| 🗺️ **Roadmap Generator** | 6-month / 1-year / 3-year learning plans |
| 📚 **Course Suggestions** | IBM SkillsBuild, Coursera, edX recommendations |
| 📝 **Resume Reviewer** | ATS score + keyword gaps + rewritten bullets |
| 👤 **Profile Dashboard** | Student profile with skills, metrics & activity |
| 🌙 **Dark Mode** | System-aware with toggle switch |
| 📱 **Mobile Responsive** | Full Bootstrap 5 responsive layout |

---

## 🏗️ Project Structure

```
career_counselor/
├── app.py                    # Flask application + API routes
├── requirements.txt          # Python dependencies
├── .env.example              # Environment variables template
├── agent/
│   ├── __init__.py
│   ├── instructions.py       # AGENT_INSTRUCTIONS + system prompt
│   └── career_agent.py       # IBM watsonx.ai Granite integration
├── templates/
│   ├── index.html            # Landing page with hero
│   ├── dashboard.html        # Student profile & metrics
│   ├── assessment.html       # 5-step career assessment
│   ├── chatbot.html          # AI chat interface
│   └── roadmap.html          # Roadmap + skill gap + courses + resume
└── static/
    ├── css/style.css         # Complete responsive stylesheet
    └── js/app.js             # Frontend logic, chat, animations
```

---

## 🚀 Quick Start (Local)

### 1. Clone / Navigate to the Project
```bash
cd career_counselor
```

### 2. Create a Virtual Environment
```bash
python -m venv venv

# Windows
venv\Scripts\activate

# macOS / Linux
source venv/bin/activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
```bash
# Copy the example file
cp .env.example .env

# Edit .env and add your credentials:
# IBM_API_KEY=your_ibm_cloud_api_key
# WATSONX_PROJECT_ID=your_watsonx_project_id
```

### 5. Run the Application
```bash
python app.py
```

Open your browser at **http://localhost:5000** 🎉

---

## 🔐 IBM Cloud Setup (Step-by-Step)

### Step 1 – Create Free IBM Cloud Account
1. Go to [https://cloud.ibm.com/registration](https://cloud.ibm.com/registration)
2. Sign up with email (no credit card required for Lite tier)
3. Verify your email

### Step 2 – Generate an API Key
1. Go to **IBM Cloud Console** → **Manage** → **Access (IAM)** → **API Keys**
2. Click **Create an IBM Cloud API key**
3. Name it `CareerGuide-AI-Key`
4. **Copy and save the key** (shown only once!)
5. Add to `.env`: `IBM_API_KEY=your_key_here`

### Step 3 – Create a watsonx.ai Project
1. Go to [https://dataplatform.cloud.ibm.com](https://dataplatform.cloud.ibm.com)
2. Click **New project** → **Create an empty project**
3. Name: `CareerGuide AI`
4. Associate with **Watson Machine Learning** service (free Lite tier)
5. Go to **Manage** tab → Copy the **Project ID**
6. Add to `.env`: `WATSONX_PROJECT_ID=your_project_id_here`

### Step 4 – Verify Granite Model Access
1. In your watsonx.ai project, go to **Assets** → **New asset** → **Work with text**
2. Select the **Granite 13B Chat v2** model
3. If it's available, your credentials are correctly configured

### Step 5 – Configure .env
```env
IBM_API_KEY=your_actual_api_key
WATSONX_PROJECT_ID=your_actual_project_id
WATSONX_URL=https://us-south.ml.cloud.ibm.com
GRANITE_MODEL_ID=ibm/granite-13b-chat-v2
FLASK_SECRET_KEY=generate_random_32_char_string
FLASK_ENV=development
PORT=5000
```

---

## 🤖 Agent Instructions Overview

The `agent/instructions.py` file contains comprehensive `AGENT_INSTRUCTIONS` that control:

| Section | Details |
|---|---|
| **Counseling Style** | Empathetic, evidence-based, structured |
| **Agent Capabilities** | Career recommendations, skill gap, roadmap, courses, resume, interview |
| **Career Domains** | 20+ careers across Tech, Business, Design, Science |
| **Recommendation Rules** | Multi-factor scoring, passion weighting, GPA adjustments |
| **Skill Scoring Matrix** | Beginner → Expert scale (1–10) |
| **Safety Guidelines** | Non-discriminatory, ethical, privacy-respecting |
| **Output Format** | Markdown with tables, bullets, emoji icons |
| **Fallback Behavior** | Graceful degradation when API unavailable |

---

## 🌐 API Endpoints

| Method | Endpoint | Description |
|---|---|---|
| `GET` | `/` | Landing page |
| `GET` | `/dashboard` | Student profile dashboard |
| `GET` | `/assessment` | Career assessment wizard |
| `GET` | `/chatbot` | AI chat interface |
| `GET` | `/roadmap` | Roadmap & tools page |
| `POST` | `/api/profile` | Save student profile |
| `GET` | `/api/profile` | Get saved profile |
| `POST` | `/api/chat` | AI chat message |
| `POST` | `/api/assess` | Career assessment |
| `POST` | `/api/skill-gap` | Skill gap analysis |
| `POST` | `/api/roadmap` | Generate roadmap |
| `POST` | `/api/courses` | Course suggestions |
| `POST` | `/api/resume` | Resume review |
| `GET` | `/api/history` | Chat history |
| `DELETE` | `/api/history` | Clear chat history |
| `GET` | `/api/health` | Health + watsonx status |

---

## ☁️ Deployment on IBM Cloud (Code Engine)

### Option 1: IBM Cloud Code Engine (Recommended – Free Tier)

```bash
# Install IBM Cloud CLI
# https://cloud.ibm.com/docs/cli

# Login
ibmcloud login --apikey $IBM_API_KEY

# Create Code Engine project
ibmcloud ce project create --name career-guide-ai

# Set current project
ibmcloud ce project select --name career-guide-ai

# Deploy from source (auto-detects Flask)
ibmcloud ce app create \
  --name career-guide-ai \
  --build-source . \
  --env IBM_API_KEY=$IBM_API_KEY \
  --env WATSONX_PROJECT_ID=$WATSONX_PROJECT_ID \
  --env WATSONX_URL=https://us-south.ml.cloud.ibm.com \
  --env GRANITE_MODEL_ID=ibm/granite-13b-chat-v2 \
  --env FLASK_SECRET_KEY=your_secret_key \
  --port 5000 \
  --min-scale 0 \
  --max-scale 3

# Get the public URL
ibmcloud ce app get --name career-guide-ai
```

### Option 2: Docker Deployment

```dockerfile
# Dockerfile (create in career_counselor/)
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 5000
CMD ["gunicorn", "-w", "2", "-b", "0.0.0.0:5000", "app:app"]
```

```bash
docker build -t career-guide-ai .
docker run -p 5000:5000 --env-file .env career-guide-ai
```

### Option 3: Heroku / Render

```bash
# procfile already supported via gunicorn in requirements.txt
echo "web: gunicorn app:app" > Procfile
# Set environment variables in the platform dashboard
```

---

## 🔒 Security Best Practices

- ✅ API keys loaded via `python-dotenv` from `.env` (never hardcoded)
- ✅ `.env` file in `.gitignore` (never committed to version control)
- ✅ Flask `SECRET_KEY` for secure session management
- ✅ Flask-CORS configured for cross-origin requests
- ✅ Input validation on all API endpoints
- ✅ Session-based conversation history (no persistent DB required)
- ✅ Graceful fallback when IBM API is unavailable

---

## 🛠️ Customisation Guide

### Change the Granite Model
In `.env`:
```env
# Available IBM Granite models (Lite tier):
GRANITE_MODEL_ID=ibm/granite-13b-chat-v2        # Recommended
GRANITE_MODEL_ID=ibm/granite-7b-lab              # Faster, smaller
GRANITE_MODEL_ID=ibm/granite-20b-code-instruct   # Code-focused
```

### Adjust Agent Behaviour
Edit `agent/instructions.py`:
- Modify `SYSTEM_PROMPT` to change the AI persona
- Add custom career domains to the domain list
- Modify recommendation rules for your target audience
- Adjust safety guidelines as needed

### Add New API Endpoints
In `app.py`, follow the existing pattern:
```python
@app.route("/api/my-feature", methods=["POST"])
def my_feature():
    data = request.get_json(silent=True) or {}
    # Call agent function
    result = generate_response(prompt, SYSTEM_PROMPT)
    return jsonify({"result": result})
```

---

## 📊 IBM Granite Model Parameters

| Parameter | Value | Effect |
|---|---|---|
| `MAX_NEW_TOKENS` | 1200–1800 | Response length |
| `TEMPERATURE` | 0.7 | Creativity (0=deterministic, 1=creative) |
| `TOP_P` | 0.9 | Nucleus sampling |
| `TOP_K` | 50 | Top-k sampling |
| `REPETITION_PENALTY` | 1.1 | Reduce repetition |
| `STOP_SEQUENCES` | `["Student:", "Human:"]` | Stop at role switches |

---

## 🐛 Troubleshooting

| Problem | Solution |
|---|---|
| `IBM_API_KEY not set` | Copy `.env.example` → `.env` and add your key |
| `watsonx_connected: false` | Verify `WATSONX_PROJECT_ID` and model access |
| `ModuleNotFoundError: ibm_watsonx_ai` | Run `pip install -r requirements.txt` |
| Session data not persisting | Set a stable `FLASK_SECRET_KEY` in `.env` |
| Slow responses | Normal — Granite API latency is 3–8 seconds |
| `429 Too Many Requests` | IBM Lite tier rate limit; wait 1 minute |

---

## 📚 Resources

- [IBM watsonx.ai Documentation](https://dataplatform.cloud.ibm.com/docs/content/wsj/getting-started/welcome-main.html)
- [IBM Granite Model Card](https://www.ibm.com/granite)
- [IBM SkillsBuild – Free Courses](https://skillsbuild.org)
- [ibm-watsonx-ai Python SDK](https://ibm.github.io/watsonx-ai-python-sdk/)
- [IBM Cloud Code Engine](https://cloud.ibm.com/codeengine)
- [Flask Documentation](https://flask.palletsprojects.com/)

---

## 📄 License

MIT License – Free to use, modify, and distribute.

---

<p align="center">
  🤖 <strong>CareerGuide AI</strong> · Built with ❤️ using IBM watsonx.ai · Granite Foundation Models
</p>
