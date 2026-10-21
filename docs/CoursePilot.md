# **LOMUGDANG, LUI FRANZ					BSCS 4C**

## **CoursePilot**

### AI-Powered Academic Dashboard for Canvas LMS

---

# **1\. Project Summary**

## **Project Title**

**CoursePilot: AI-Powered Academic Dashboard for Canvas LMS**

## **Project Description**

CoursePilot is a full-stack AI-powered web application that integrates with a student's Canvas Learning Management System (LMS) account to reduce information overload and help students focus on what truly matters.

Students often receive important academic information across multiple locations inside Canvas, including assignments, quizzes, modules, announcements, discussions, calendars, and course pages. As semesters progress, this information becomes increasingly difficult to manage, causing students to miss deadlines and overlook important announcements.

CoursePilot solves this problem by synchronizing a student's Canvas data into a centralized database and using Retrieval-Augmented Generation (RAG) to intelligently retrieve only the most relevant academic information. Instead of displaying every notification or announcement, the system prioritizes deadlines, assignment updates, schedule changes, and other actionable information inside a clean dashboard.

Rather than replacing Canvas, CoursePilot acts as an intelligent layer on top of an existing Learning Management System, helping students stay organized and informed without constantly navigating multiple course pages.

## **Target Users**

* College students  
* Universities  
* Educational institutions using Canvas LMS

## **Core Resource**

The application's primary CRUD resource is **Academic Tasks**, which include:

* Assignments  
* Quizzes  
* Projects  
* Exams  
* Required activities  
* Reading tasks

Users can:

* Create personal academic tasks  
* View synchronized tasks from Canvas  
* Update completion status  
* Edit personal notes  
* Delete manually created tasks

---

# **2\. AI Feature Justification**

## **AI Category**

**Retrieval-Augmented Generation (RAG)**

---

## **What the AI Does**

CoursePilot does not function as a general-purpose chatbot.

Instead, it uses Retrieval-Augmented Generation (RAG) to answer questions using only information retrieved from the student's synchronized Canvas data.

Examples include:

* Summarizing lengthy announcements into concise action items.  
* Identifying deadline changes made by instructors.  
* Listing today's highest-priority tasks.  
* Recommending which assignments should be completed first.  
* Answering questions such as:  
  * "What should I work on today?"  
  * "Did any professor move a deadline?"  
  * "Which assignments are due this week?"  
  * "What important announcements did I miss?"

The AI only uses documents retrieved from the student's own academic database and does not generate responses from general internet knowledge.

---

## **Backend Processing**

The AI output is processed through multiple backend stages before reaching the frontend.

### **Workflow**

Canvas LMS

↓

Synchronize course data

↓

Normalize and validate data

↓

Remove duplicate records

↓

Store in PostgreSQL

↓

Generate vector embeddings

↓

Store embeddings using pgvector

↓

Retrieve relevant documents

↓

Send retrieved context to the LLM

↓

Validate AI response

↓

Return structured response to frontend

---

### **Backend Responsibilities**

The backend performs several important operations:

* Synchronizes Canvas course information  
* Validates assignment deadlines  
* Removes duplicate academic records  
* Stores normalized data in PostgreSQL  
* Generates vector embeddings for semantic search  
* Retrieves relevant academic documents for RAG  
* Filters unnecessary information  
* Logs AI requests  
* Handles AI failures gracefully  
* Returns structured JSON responses to the frontend

This ensures that the AI is part of a larger application workflow rather than acting as a simple pass-through chatbot.

---

## **AI Provider**

Primary Cloud LLM

* OpenAI GPT-5

Optional Local LLM Support

* Ollama  
* Llama 3  
* Qwen  
* Mistral

Embeddings

* OpenAI Embeddings API (initial implementation)  
* Future support for local embedding models

The application is designed to support both cloud-based and local language models, making the architecture flexible and extensible.

---

# **3\. Database Schema Sketch**

## **Users**

| Field | Description |
| ----- | ----- |
| id | Primary Key |
| clerk\_user\_id | Clerk User ID |
| email | User email |
| full\_name | Student name |
| created\_at | Timestamp |

---

## **Courses**

| Field | Description |
| ----- | ----- |
| id | Primary Key |
| user\_id | Foreign Key |
| canvas\_course\_id | Canvas Course ID |
| course\_code | Course code |
| course\_name | Course name |
| instructor | Instructor |
| semester | Semester |

Relationship:

One User → Many Courses

---

## **Academic Tasks**

| Field | Description |
| ----- | ----- |
| id | Primary Key |
| course\_id | Foreign Key |
| canvas\_task\_id | Canvas Assignment ID |
| title | Assignment title |
| description | Assignment description |
| type | Assignment / Quiz / Exam |
| due\_date | Deadline |
| priority | AI-generated priority |
| status | Pending / Completed |
| created\_at | Timestamp |

Relationship:

One Course → Many Academic Tasks

---

## **Announcements**

| Field | Description |
| ----- | ----- |
| id | Primary Key |
| course\_id | Foreign Key |
| canvas\_announcement\_id | Canvas Announcement ID |
| title | Announcement title |
| content | Announcement body |
| importance\_score | AI-generated score |
| posted\_at | Timestamp |

Relationship:

One Course → Many Announcements

---

## **Documents**

Knowledge base for Retrieval-Augmented Generation.

| Field | Description |
| ----- | ----- |
| id | Primary Key |
| course\_id | Foreign Key |
| source\_type | Announcement / Module / Page |
| title | Document title |
| content | Indexed content |
| embedding | Vector embedding |
| indexed\_at | Timestamp |

Relationship:

One Course → Many Documents

---

## **Database Relationship**

Users

↓

Courses

↓

Academic Tasks

↓

Announcements

↓

Documents

---

# **4\. Tech Stack Declaration**

## **Frontend**

* Next.js 15 (App Router)  
* React  
* TypeScript  
* Tailwind CSS

---

## **Backend**

* Next.js Route Handlers (REST API)  
* Server Actions (where appropriate)

---

## **Database**

* Supabase PostgreSQL  
* pgvector extension  
* SQL / Supabase Query Builder (No ORM)

---

## **Authentication**

* Clerk Authentication

---

## **AI**

Cloud Models

* OpenAI GPT-5

Optional Local Models

* Ollama  
* Llama 3  
* Qwen  
* Mistral

Embeddings

* OpenAI Embeddings API  
* Future support for local embedding models

---

## **Hosting (Planned)**

Frontend & Backend

* Vercel

Database

* Supabase

---

# **5\. Risk & Feasibility Self-Check**

## **What is the riskiest technical part?**

The biggest technical challenge is integrating with the Canvas Learning Management System. API permissions and available endpoints may vary depending on how an institution has configured its Canvas instance.

Another challenge is ensuring that retrieved academic information is correctly synchronized without creating duplicate records or missing important updates.

---

## **Fallback Plan**

If direct Canvas API integration is unavailable, the application will allow students to import exported Canvas data or upload course syllabus PDFs. The imported information will be processed into the same internal database structure, allowing all dashboard and RAG functionality to continue operating without major architectural changes.

---

## **AI API Access**

The project will use the OpenAI API for cloud inference.

The architecture will also support optional local models through Ollama to reduce API usage and improve development flexibility.

---

# **6\. Environment Plan**

Sensitive configuration values will never be committed to version control.

A **.env** file will store all secret credentials during development.

A **.env.example** file containing only variable names will be included for deployment.

Expected environment variables include:

* CLERK\_SECRET\_KEY  
* NEXT\_PUBLIC\_CLERK\_PUBLISHABLE\_KEY  
* OPENAI\_API\_KEY  
* DATABASE\_URL  
* SUPABASE\_URL  
* SUPABASE\_ANON\_KEY  
* SUPABASE\_SERVICE\_ROLE\_KEY  
* CANVAS\_API\_URL  
* CANVAS\_ACCESS\_TOKEN

---

# **System Workflow**

Student signs in using Clerk

↓

Backend authenticates user

↓

Synchronize Canvas course information

↓

Normalize retrieved data

↓

Store records in Supabase PostgreSQL

↓

Generate vector embeddings

↓

Store embeddings using pgvector

↓

Student opens dashboard

↓

Relevant academic documents retrieved

↓

RAG sends only relevant context to the LLM

↓

AI generates personalized academic summary

↓

Dashboard displays:

* Today's Priorities  
* Upcoming Deadlines  
* Important Announcements  
* Recent Deadline Changes  
* AI Academic Assistant

---

# **Project Requirements Checklist**

| Requirement | Status |
| ----- | ----- |
| CRUD Operations |   Academic Tasks, Courses, Announcements |
| AI Integration |   Retrieval-Augmented Generation (RAG) |
| Backend API |   Next.js REST Route Handlers |
| Functional Frontend |   Next.js Dashboard |
| Relational Database |   PostgreSQL (Supabase) |
| Environment Management |   .env and .env.example |
| Error Handling |   Canvas API, AI API, and validation errors |

---

# **Conclusion**

CoursePilot is an AI-powered academic productivity platform that enhances the student learning experience by transforming scattered Canvas information into a clean, intelligent dashboard. Through Retrieval-Augmented Generation (RAG), the application retrieves only relevant academic information, helping students prioritize deadlines, identify important announcements, and stay organized throughout the semester.

By combining a modern full-stack architecture, relational database design, AI-powered retrieval, secure authentication, and scalable cloud infrastructure, CoursePilot satisfies all endterm project requirements while demonstrating a practical, real-world application of AI beyond a simple chatbot.

