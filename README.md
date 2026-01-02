# ROS Swarm Mission Control



# 🛰️ Next-Gen Mission Control Platform

**A high-fidelity, NASA-inspired Mission Control system for real-time multi-robot swarm coordination, monitoring, and task allocation.**

---

## 📌 Abstract

This project presents a **Next-generation Mission Control platform** designed for intelligent multi-robot systems. It combines **Secure role-based authentication**, **Real-time telemetry**, **Interactive task injection**, and an **Advanced market-based auction algorithm** into a unified, browser-based control center.

The system is intentionally built **without ROS 2 or heavy external dependencies**, enabling rapid deployment, easy demonstrations, and platform-agnostic execution while still modeling realistic swarm intelligence behaviors.

---

## 🎯 Project Goals

* Enable **human-in-the-loop control** of robot swarms
* Provide **real-time situational awareness** through a professional dashboard
* Implement **energy-aware, priority-based task allocation**
* Maintain **simplicity, portability, and performance**
* Deliver a **Mission Control–grade UI/UX**

---

## 🧠 System Architecture

### Backend — **FastAPI (Python)**

#### Simulation Engine

* Market-based auction algorithm
* Energy-constrained decision making
* Load-balanced task distribution
* Priority-aware bidding mechanism

#### API Layer

* RESTful endpoints for:

  * Swarm state retrieval
  * Dynamic task injection
  * Mission pause / resume control

#### Authentication & Authorization

* Mock authentication system
* Role-Based Access Control (RBAC):

  * **Admin** — Full system control
  * **Operator** — Mission & task management
  * **Viewer** — Read-only telemetry access

---

### Frontend — **Vite + Vanilla JavaScript**

#### Mission Control Dashboard

* Dark, aerospace-inspired theme
* Glassmorphic UI components
* High-contrast operational panels

#### Live Telemetry

* Robot positions (2D map)
* Energy levels
* Active tasks & assignments
* Mission execution state

#### Interactive Map Interface

* HTML5 Canvas-based visualization
* Click-to-inject tasks in real time
* Priority-driven task creation

---

## ✨ Core Features

* 🔐 **Secure Role-Based Login**
* 📡 **Real-Time Swarm Monitoring (10Hz)**
* 🎯 **Live Task Injection During Mission**
* 🤖 **Advanced Auction-Based Task Allocation**
* ⚡ **Zero-Dependency Simulation Environment**
* 🌐 **Cross-Platform Browser Execution**

---

## 🧮 Auction Cost Function

Each robot computes its bid using a weighted cost model:

* **Distance to task**
* **Remaining energy**
* **Current workload**
* **Task priority**

This enables:

* Energy-efficient assignments
* Fair workload distribution
* High-priority task preemption

---

## 🖥️ Running the Project

### Step 1 — Start the System

```bash
LAUNCH_MISSION
```

### Step 2 — Open in Browser

```
http://localhost:5173
```
<img width="1920" height="819" alt="Screenshot (51)" src="https://github.com/user-attachments/assets/c938cd2e-4a6c-4211-ba3d-5e49ea754865" />


### Step 3 — Login Credentials

| Role  | Username | Password |
| ----- | -------- | -------- |
| Admin | admin    | password |

---

## 🛠️ Technology Stack

| Layer      | Technology          |
| ---------- | ------------------- |
| Backend    | Python, FastAPI     |
| Frontend   | Vite, Vanilla JS    |
| UI         | HTML5 Canvas, CSS   |
| Auth       | Mock RBAC           |
| Simulation | Custom Swarm Engine |

---

## 🚀 Use Cases

* Swarm robotics research
* Human-robot interaction demos
* Mission planning simulations
* Educational platforms
* Portfolio & system design showcases

---

## 🧭 Roadmap

* WebSocket-based real-time streaming
* Persistent mission storage & replay
* Obstacle-aware path planning
* Multi-map / multi-zone missions
* ROS 2 or real-robot bridge (optional)
* AI-driven predictive task allocation

---

## 📄 License

MIT License
Free for academic, commercial, and research use.

---

## 🧑‍🚀 Inspiration

Inspired by:

* NASA Mission Control systems
* Aerospace ground-station interfaces
* Contemporary swarm robotics research


## 📬 Contact / Contribution

Contributions, issues, and feature requests are welcome.
This project is designed to be **extensible, readable, and research-friendly**.





