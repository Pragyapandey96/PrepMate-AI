// Pre-filled Backend Software Engineer candidate + role for demos.
window.DEMO_DATA = {
  candidate: {
    name: "Aditya Rao",
    email: "aditya.rao@example.com",
    initials: "AR",
  },
  resume: {
    filename: "Aditya_Rao_Resume.pdf",
    name: "Aditya Rao",
    headline: "Software Engineer · 2 yrs experience",
    location: "Bengaluru, India",
    skills: [
      "Java", "Node.js", "Express", "TypeScript", "MongoDB", "PostgreSQL",
      "REST APIs", "Docker", "AWS (EC2, S3)", "Redis", "Git", "DSA"
    ],
    experience: [
      {
        role: "Software Engineer",
        company: "Zenlyt Technologies",
        dates: "Jun 2024 — Present",
        bullets: [
          "Built order-processing microservice in Node.js/Express handling 40k req/day.",
          "Reduced p95 checkout latency 38% by caching product metadata in Redis.",
        ]
      },
      {
        role: "SDE Intern",
        company: "Fintra Labs",
        dates: "Jan 2024 — May 2024",
        bullets: [
          "Owned migration of two Java monolith modules to Spring Boot services.",
          "Wrote integration tests with JUnit + Testcontainers.",
        ]
      }
    ],
    education: [
      {
        school: "NIT Trichy",
        degree: "B.Tech, Computer Science",
        dates: "2020 — 2024",
        detail: "CGPA 8.6"
      }
    ],
    projects: [
      {
        name: "ShopNest",
        stack: "React · Node.js · MongoDB · Razorpay",
        blurb: "Full-stack e-commerce site with cart, JWT auth, admin dashboard, and Razorpay integration."
      },
      {
        name: "InkStack",
        stack: "Next.js · PostgreSQL · Prisma",
        blurb: "Developer blogging platform with markdown editor and tag-based feeds."
      }
    ],
    certifications: ["AWS Certified Cloud Practitioner"]
  },
  jd: {
    title: "Backend Software Engineer",
    company: "Northwind Labs",
    location: "Bengaluru (Hybrid)",
    experience: "1–3 years",
    summary: "We're hiring a backend engineer to help scale our order and payments platform. You'll design REST APIs, own data models, and improve reliability of services handling millions of monthly transactions.",
    required: ["Java or Node.js", "REST API design", "SQL (Postgres)", "Git", "DSA fundamentals", "Unit & integration testing"],
    preferred: ["MongoDB", "Docker", "AWS", "Message queues (Kafka / SQS)", "Distributed systems basics"],
    responsibilities: [
      "Design and build backend services for order lifecycle and payments.",
      "Own data models, migrations, and query performance in Postgres.",
      "Write clean, well-tested code with strong observability.",
      "Collaborate with product and frontend to ship end-to-end features.",
      "Participate in on-call rotation and incident response."
    ]
  },
  history: [
    { date: "Sep 15, 2026", role: "Backend Developer", type: "Mixed", difficulty: "Medium", score: 76, id: "iv_2609151" },
    { date: "Sep 08, 2026", role: "Software Engineer", type: "Technical", difficulty: "Medium", score: 71, id: "iv_2609081" },
    { date: "Aug 29, 2026", role: "SDE-1", type: "Behavioral", difficulty: "Easy", score: 82, id: "iv_2608291" },
    { date: "Aug 21, 2026", role: "Java Backend", type: "Technical", difficulty: "Hard", score: 64, id: "iv_2608211" },
    { date: "Aug 12, 2026", role: "Full-Stack Engineer", type: "Mixed", difficulty: "Medium", score: 68, id: "iv_2608121" },
  ],
  // Sample already-completed interview so the Report screen has real content.
  sampleReport: {
    id: "iv_2609171",
    date: "Sep 17, 2026",
    role: "Backend Software Engineer",
    type: "Mixed",
    difficulty: "Medium",
    durationMin: 22,
    questionsAsked: 8,
    overallScore: 82,
    scores: {
      technical: 85, communication: 74, problemSolving: 88,
      relevance: 91, resumeKnowledge: 80, jobFit: 84,
      completeness: 78, confidence: 76,
    },
    strengths: [
      "Explained system design decisions with concrete tradeoffs.",
      "Strong grasp of REST API design and error handling patterns.",
      "Referenced specific metrics from ShopNest work (p95, throughput).",
    ],
    weaknesses: [
      "Some SQL answers lacked depth on joins and indexing strategies.",
      "Answers occasionally trailed off without a clear conclusion.",
      "Behavioral answers didn't follow a consistent structure (STAR).",
    ],
    recommendations: [
      { title: "Revise SQL joins, indexing and query plans", priority: "High", area: "SQL" },
      { title: "Practice STAR structure for behavioral answers", priority: "High", area: "Communication" },
      { title: "Explain REST + auth flows in under 90 seconds", priority: "Medium", area: "Backend" },
      { title: "Review message queues (Kafka, SQS) — mentioned in JD", priority: "Medium", area: "Systems" },
    ],
    questions: [
      {
        q: "Tell me about the ShopNest project — what was the hardest part of building it?",
        a: "The hardest part was the payments integration with Razorpay. Handling webhook retries and making sure we didn't create duplicate orders required idempotency keys on the order table and a small reconciliation job that ran every 15 minutes.",
        score: 88,
        good: "Concrete example, mentioned idempotency and reconciliation — real production-grade thinking.",
        missing: "Didn't cover how failures were surfaced to users or how support handled disputed transactions.",
        better: "Add one sentence on user-visible error handling and a metric like reconciliation success rate."
      },
      {
        q: "Why did you choose MongoDB over Postgres for ShopNest?",
        a: "Because the product catalog had varying attributes per category and it was easier to store as documents without a rigid schema.",
        score: 72,
        good: "Correct reasoning — flexible schema fits catalog data.",
        missing: "Didn't discuss tradeoffs — no transactions across collections, index cost, or when Postgres jsonb would have been sufficient.",
        better: "Contrast the two: 'Mongo gave flexible attributes, but if we needed multi-item transactions I would have used Postgres with jsonb columns.'"
      },
      {
        q: "Walk me through what happens when a client hits POST /orders in your service.",
        a: "The request goes through an auth middleware, then validates the payload with Joi, then we check inventory in Redis, then write the order to Mongo, then publish an event.",
        score: 84,
        good: "Clear step-by-step, mentioned caching layer and event publishing.",
        missing: "No discussion of transactions, failure modes, or what happens if the event publish fails after the DB write.",
        better: "Cover the outbox pattern or 'dual write' problem — critical for backend interviews."
      },
      {
        q: "Design a rate limiter for our public API. How would you approach it?",
        a: "I'd use a token bucket algorithm stored in Redis, keyed by API key. Each request decrements the token count, tokens refill at a fixed rate.",
        score: 90,
        good: "Chose the right algorithm and storage; explained refill mechanic.",
        missing: "Didn't cover distributed edge cases (Redis failover) or burst allowances.",
        better: "Add: 'For HA I'd use Redis Cluster with replicas, and expose Retry-After headers on 429s.'"
      },
      {
        q: "How would you index a Postgres table with 50M rows queried by (user_id, created_at)?",
        a: "I'd add a composite index on user_id and created_at.",
        score: 62,
        good: "Correct choice of composite index.",
        missing: "No discussion of column order, DESC ordering for time-based queries, or covering indexes.",
        better: "'Composite index on (user_id, created_at DESC), and INCLUDE frequently-selected columns to make it covering.'"
      },
      {
        q: "Tell me about a time you disagreed with a teammate on a technical decision.",
        a: "At Zenlyt I disagreed about using MongoDB for a new service. I thought Postgres was better. We had a discussion and ended up going with Postgres.",
        score: 65,
        good: "Real example, honest.",
        missing: "No STAR structure — no clear Situation, Task, Action, Result. Missing what you did specifically and the outcome.",
        better: "STAR it: Situation (new service, DB choice), Task (recommend one), Action (I benchmarked both and shared a doc), Result (team chose Postgres, migration took 2 weeks)."
      },
      {
        q: "You mentioned reducing p95 latency 38%. Walk me through how you measured and validated that.",
        a: "We had Datadog dashboards showing p95 for the checkout endpoint. Before the Redis change it was around 640ms, after it was around 400ms. I ran the change for a week and compared.",
        score: 86,
        good: "Cited real tool (Datadog), specific numbers, and a validation window.",
        missing: "Didn't mention control for confounders (traffic patterns, other deploys).",
        better: "'I also compared week-over-week for the same weekday to control for traffic shape.'"
      },
      {
        q: "Where do you see yourself in two years?",
        a: "I want to grow into a senior backend engineer, own bigger systems end to end, and maybe start mentoring interns.",
        score: 80,
        good: "Specific, tied to backend track, includes mentorship signal.",
        missing: "No mention of the role you're interviewing for.",
        better: "'…and I think a role like this one — owning a payments platform at scale — is exactly the growth I'm looking for.'"
      },
    ]
  }
};
