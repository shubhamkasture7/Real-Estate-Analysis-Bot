# 🏠 Real Estate Insights Chatbot  
_A Smart Chat-based Real Estate Analytics System powered by AI & Data Visualization_

---

## 📌 Project Overview

Real Estate Insights Chatbot is an **AI-powered web platform** that provides quick real estate analysis using **natural language queries**.  
Users can ask questions like:

- “Analyze Wakad”
- “Show price growth for Akurdi over the last 3 years”
- “Compare Ambegaon Budruk and Aundh demand trends”

The chatbot responds with:
✔ AI-generated Locality Summary  
✔ Price / Demand Trends (Charts)  
✔ Data Table Extracted From Real Excel Dataset  
✔ CSV / Table Download Option  

All running on **React + Django + Gemini AI** ⚡

---

## 🧠 Key Features

| Feature | Description |
|--------|-------------|
| 🔎 Natural Language Queries | Just type your question & get insights |
| 📊 Dynamic Charts | Price/Demand trend visualization |
| 🧠 AI-Powered Summary | Google Gemini generates descriptions |
| 📈 Excel Dataset Integration | Uses Pandas for real data processing |
| 🪄 Locality Auto-Detection | Automatically identifies areas in text |
| ⬇ Export | Download filtered data as table/CSV |

---

## 🏗️ Tech Stack

### 🌐 Frontend
- React (Vite)
- Recharts
- Modern UI + Animations

### 🔥 Backend
- Django + REST API
- Pandas for Data
- Google Gemini AI (Text Generation)

### 📦 Data
- Provided Excel dataset

---

## ⚙️ Setup & Installation

### 1️⃣ Clone Repository

```bash
git clone https://github.com/<your-username>/realestate-chatbot.git
cd realestate-chatbot


---

2️⃣ Backend Setup (Django)

cd backend
python -m venv venv
venv\Scripts\activate   # for Windows
pip install -r requirements.txt
python manage.py migrate

Create .env in backend folder:

GEMINI_API_KEY=AIxxxxxxxxxxxxxxxxxxxx

Run server:

python manage.py runserver

Backend will run at:
👉 http://127.0.0.1:8000


---

3️⃣ Frontend Setup (React)

cd frontend
npm install
npm run dev

Frontend will run at:
👉 http://localhost:5173/


---

🔗 API Endpoint

Route	Method	Description

/api/query/	POST	Analyze locality & return chart + summary


Example Request:

{
  "query": "Analyze Wakad"
}


---

🚀 Future Enhancements

Multi-locality Comparison Trends

Predictive Price Modeling (ML Integration)

Secure Auth System

Deployment to Cloud



---

👨‍💻 Developer

Shubham Kasture
Full-Stack Developer | AI Integrator
🚀 Turning ideas into working applications

📌 Connect With Me
🔗 GitHub: https://github.com/shubhamkasture7
💼 LinkedIn: https://www.linkedin.com/in/shubham-kasture


---

⭐ Support

If you like this project, please give it a ⭐ on GitHub!
It motivates me to build more awesome projects 🚀

---
