# MARVOTE: A Cloud-Integrated, Real-Time Electoral Dashboard for OSIS Margana Duvanesto

## Project Overview
**MARVOTE** (Margana Voice & Vote) is a high-performance, secure, and fully dynamic web-based e-voting platform engineered to modernize the student council presidential election for **OSIS Margana Duvanesto** at SMKN 2 Mojokerto. 

Moving away from traditional paper ballots and rigid static web setups, MARVOTE introduces a modern cloud-native architecture. The system decouples the front-end user experience from the data layer, utilizing a backend-as-a-service (BaaS) infrastructure to achieve live updates, strict access validation, and immutable data storage.

---

## Technical Architecture & Tech Stack
The platform is built using a modern, lightweight, and highly responsive technology stack designed for rapid deployment and seamless data synchronization:

* **Front-End UI/UX:** Built with clean, semantic **HTML5**, **Modern JavaScript (ES6+)**, and customized utility frameworks styled with the premium **Plus Jakarta Sans** typeface to deliver a mobile-first, fluid, and foolproof user experience.
* **Database & Backend Service:** Powered by **Supabase (PostgreSQL)**, managing real-time data streaming, dynamic asset serving, and relational data integrity.
* **Security Layer:** Implements Supabase **Row Level Security (RLS)** policies to enforce strict data isolation. This guarantees that while candidate profiles, student lists, and faculty lists are public (`SELECT` only), voting transactions remain protected against unauthorized client-side manipulation.

---

## Key Features

* **Dynamic Candidate Hub:** Candidate profiles, campaign numbers, color schemes, and structural layout configurations are fetched dynamically from the cloud database upon application initialization, eliminating the need for hardcoded front-end data.
* **Automated Master Data Synchronization:** The system automatically cross-references and populates voter options (such as student classes, attendance rolls, and faculty codes) directly from the live PostgreSQL database, sorting and restructuring raw flat database rows into organized user interfaces on the fly.
* **Real-Time Data Pipeline:** Built with the capacity to stream vote counts and user engagement metrics instantly, laying the foundation for live analytics and post-election data visualization.
* **Strict Security Hardening:** Leverages granular database policies to restrict API commands based on roles (e.g., public anonymous read-only access for profiles vs. restricted execution for ballot submissions).

---

## Database Schema Structures

MARVOTE relies completely on a structured PostgreSQL database rather than static local code dictionaries. Below are the underlying relational table architectures deployed on Supabase:

### 1. Students Table (`students`)
Stores master record verification for student voter credentials.
```sql
create table students (
  id bigint generated always as identity primary key,
  kelas text not null,
  absen int not null,
  nama text not null,
  unique (kelas, absen)
);

```

### 2. Teachers Table (`teachers`)

Stores instructor identification strings for faculty voters.

```sql
create table teachers (
  code text primary key,
  nama text not null
);

```

### 3. Candidates Table (`candidates`)

Stores the dynamic card metadata for the running presidential pairs.

```sql
create table candidates (
  id text primary key,
  name text not null,
  visi text not null,
  misi text not null,
  photo text,
  num text,
  pb text,
  color text
);

```

### 4. Votes Table (`votes`)

Logs anonymous electoral choices with strict client-side integrity blocks.

```sql
create table votes (
  id bigint generated always as identity primary key,
  voter_name text not null,
  voter_role text not null,
  voter_identifier text unique not null,
  candidate_id text not null,
  candidate_name text not null,
  timestamp timestamp with time zone default timezone('utc'::text, now()) not null
);

```

---

## Portfolio Value (Data & Software Engineering Impact)

As a project designed for a professional engineering portfolio, MARVOTE demonstrates proficiency in several core competencies:

1. **Database Design & Normalization:** Translating complex nested JSON structures into clean, query-efficient relational database tables (`candidates`, `students`, `teachers`, `votes`).
2. **Asynchronous JavaScript & API Integration:** Implementing advanced `async/await` design patterns, robust error handling, and local fallback mechanisms to ensure the web application remains functional even during unexpected network latency or API drops.
3. **Data-Driven Architecture:** Creating an application environment where the entire user experience changes dynamically based solely on modifications made to the backend data layer, minimizing maintenance overhead.

---

## Installation & Local Setup

1. **Clone the repository:**
```bash
git clone [https://github.com/yourusername/marvote.git](https://github.com/yourusername/marvote.git)
cd marvote

```


2. **Launch the application:**
Open `index.html` directly or use the **Live Server** extension in VS Code.
3. **Database Connectivity:**
Ensure your local environment configuration points to the active `SUPABASE_URL` and valid `SUPABASE_ANON_KEY` variables inside `script.js`.

```

```
