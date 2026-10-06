import { Workshop, WorkshopSeries, Course, OutcomeMapping, Material, UserProfile } from '../types';

export const INITIAL_USERS: UserProfile[] = [
  {
    id: 'admin_orkhon_erdenebaatar',
    email: 'orkhon.erdenebaatar@ucanwest.ca',
    displayName: 'Orkhon Erdenebaatar',
    role: 'administrator',
    department: 'Administration & Governance',
    assignedWorkshopCount: 6,
    createdAt: '2026-01-10T08:00:00.000Z',
  },
  {
    id: 'lead_komil_mamajanov',
    email: 'komil.mamajanov@ucanwest.ca',
    displayName: 'Komil Mamajanov',
    role: 'project_lead',
    department: 'Administration & Governance',
    assignedWorkshopCount: 4,
    createdAt: '2026-01-10T08:30:00.000Z',
  },
  {
    id: 'lead_mohsen_ghodrat',
    email: 'mohsen.ghodrat@ucanwest.ca',
    displayName: 'Mohsen Ghodrat',
    role: 'workshop_lead',
    department: 'School of Business & Technology',
    assignedWorkshopCount: 4,
    createdAt: '2026-01-12T09:00:00.000Z',
  },
  {
    id: 'lead_cheryl_thomas',
    email: 'cheryl.thomas@ucanwest.ca',
    displayName: 'Cheryl Thomas',
    role: 'workshop_lead',
    department: 'Department of Management',
    assignedWorkshopCount: 3,
    createdAt: '2026-01-12T09:15:00.000Z',
  },
  {
    id: 'lead_amirhossein_zaji',
    email: 'amirhossein.zaji@ucanwest.ca',
    displayName: 'Amirhossein Zaji',
    role: 'workshop_lead',
    department: 'Department of Analytics',
    assignedWorkshopCount: 3,
    createdAt: '2026-01-12T09:30:00.000Z',
  },
  {
    id: 'affairs_amy_hua',
    email: 'amy.hua@ucanwest.ca',
    displayName: 'Amy Hua',
    role: 'academic_affairs',
    department: 'Academic Affairs',
    assignedWorkshopCount: 0,
    createdAt: '2026-01-15T10:00:00.000Z',
  },
  {
    id: 'dev_faculty_member',
    email: 'developer@ucanwest.ca',
    displayName: 'Developer',
    role: 'developer',
    department: 'School of Business & Technology',
    assignedWorkshopCount: 2,
    createdAt: '2026-01-15T10:30:00.000Z',
  },
];

export const INITIAL_SERIES: WorkshopSeries[] = [
  {
    id: 'series-ai-01',
    name: 'AI & Emerging Tech Applications',
    prefix: 'AI',
    description: 'Comprehensive hands-on workshop series covering machine learning, prompt engineering, generative AI, and enterprise AI deployment strategies.',
    coreFocus: 'Practical AI integration for business automation, predictive analytics, and next-generation software development.',
    leadId: 'lead_mohsen_ghodrat',
    leadName: 'Mohsen Ghodrat',
    leadEmail: 'mohsen.ghodrat@ucanwest.ca',
    leadIds: ['lead_mohsen_ghodrat'],
    leads: [
      { id: 'lead_mohsen_ghodrat', name: 'Mohsen Ghodrat', email: 'mohsen.ghodrat@ucanwest.ca', department: 'School of Business & Technology' },
    ],
    workshopCount: 2,
    workshopIds: ['ws-ai-601', 'ws-ai-602'],
    status: 'Active',
    learningOutcomes: [
      { id: 'slo-ai-1', code: 'LO1', text: 'Evaluate machine learning paradigms for enterprise problem solving.', bloomLevel: 'Evaluate' },
      { id: 'slo-ai-2', code: 'LO2', text: 'Design generative AI agent workflows using advanced prompt architectures.', bloomLevel: 'Create' },
      { id: 'slo-ai-3', code: 'LO3', text: 'Implement ethical AI governance frameworks in corporate environments.', bloomLevel: 'Apply' },
    ],
    createdBy: 'admin_orkhon_erdenebaatar',
    createdByName: 'Orkhon Erdenebaatar',
    createdAt: '2026-01-15T09:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
  },
  {
    id: 'series-entr-03',
    name: 'Tech Entrepreneurship & Venture Design',
    prefix: 'ENTR',
    description: 'Ideation, rapid MVP prototyping, venture pitching, customer discovery, and startup business models.',
    coreFocus: 'Empowering students to turn tech concepts into viable, investable startup ventures.',
    leadId: 'lead_cheryl_thomas',
    leadName: 'Cheryl Thomas',
    leadEmail: 'cheryl.thomas@ucanwest.ca',
    leadIds: ['lead_cheryl_thomas'],
    leads: [
      { id: 'lead_cheryl_thomas', name: 'Cheryl Thomas', email: 'cheryl.thomas@ucanwest.ca', department: 'Department of Management' },
    ],
    workshopCount: 1,
    workshopIds: ['ws-entr-620'],
    status: 'Active',
    learningOutcomes: [
      { id: 'slo-entr-1', code: 'LO1', text: 'Synthesize customer discovery feedback into lean business canvases.', bloomLevel: 'Create' },
      { id: 'slo-entr-2', code: 'LO2', text: 'Present high-impact venture pitches to institutional investors.', bloomLevel: 'Apply' },
    ],
    createdBy: 'admin_orkhon_erdenebaatar',
    createdByName: 'Orkhon Erdenebaatar',
    createdAt: '2026-01-18T09:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
  },
];

export const INITIAL_WORKSHOPS: Workshop[] = [
  {
    id: 'ws-ai-601',
    prefix: 'AI',
    code: '601',
    title: 'Applied Machine Learning in Business',
    description: 'Explores supervised and unsupervised learning algorithms with practical business applications. Focuses on classification, regression, clustering, and decision support systems.',
    level: 'Practitioner',
    seriesId: 'series-ai-01',
    seriesName: 'AI & Emerging Tech Applications',
    status: 'Approved',
    totalDurationMinutes: 180,
    assignedDeveloperIds: ['lead_mohsen_ghodrat', 'dev_faculty_member'],
    assignedDevelopers: [
      { id: 'lead_mohsen_ghodrat', name: 'Mohsen Ghodrat', email: 'mohsen.ghodrat@ucanwest.ca', role: 'workshop_lead' },
      { id: 'dev_faculty_member', name: 'Developer', email: 'developer@ucanwest.ca', role: 'developer' },
    ],
    learningOutcomes: [
      { id: 'wlo-1', code: 'LO1', text: 'Analyze structured business datasets to identify optimal machine learning algorithms.', bloomLevel: 'Analyze' },
      { id: 'wlo-2', code: 'LO2', text: 'Train and evaluate predictive models using Scikit-Learn and Python.', bloomLevel: 'Apply' },
      { id: 'wlo-3', code: 'LO3', text: 'Interpret model evaluation metrics (ROC-AUC, Precision, Recall) for executive stakeholders.', bloomLevel: 'Evaluate' },
    ],
    topics: [
      {
        id: 't-1',
        order: 1,
        title: 'Machine Learning Fundamentals & Data Preprocessing',
        description: 'Data cleaning, feature scaling, encoding, and exploratory data analysis.',
        durationMinutes: 60,
        subtopics: [
          { id: 'st-1', title: 'Data Pipeline Engineering', durationMinutes: 30 },
          { id: 'st-2', title: 'Exploratory Statistical Analysis', durationMinutes: 30 },
        ],
      },
      {
        id: 't-2',
        order: 2,
        title: 'Supervised Learning: Regression & Classification',
        description: 'Building predictive models for churn prediction and revenue forecasting.',
        durationMinutes: 70,
        subtopics: [
          { id: 'st-3', title: 'Random Forests and Gradient Boosting', durationMinutes: 35 },
          { id: 'st-4', title: 'Hyperparameter Tuning & Cross-Validation', durationMinutes: 35 },
        ],
      },
      {
        id: 't-3',
        order: 3,
        title: 'Model Deployment & Business Translation',
        description: 'Translating model outputs into actionable business recommendations.',
        durationMinutes: 50,
        subtopics: [
          { id: 'st-5', title: 'Dashboard Integration & Explainable AI (SHAP)', durationMinutes: 50 },
        ],
      },
    ],
    activities: [
      {
        id: 'act-1',
        order: 1,
        title: 'Customer Churn Prediction Lab',
        type: 'Hands-on Lab',
        description: 'Build a random forest classifier to predict telecom customer churn with 85%+ accuracy.',
        estimatedMinutes: 45,
        instructions: 'Load the churn dataset in Google Colab and complete the 4 coding checkpoints.',
      },
      {
        id: 'act-2',
        order: 2,
        title: 'Model Evaluation Case Discussion',
        type: 'Case Study',
        description: 'Examine false positive versus false negative trade-offs in fraud detection.',
        estimatedMinutes: 25,
      },
    ],
    requiredResources: [
      { id: 'res-1', title: 'Python Jupyter Notebook Starter', description: 'Interactive Colab notebook with datasets and code skeletons.' },
      { id: 'res-2', title: 'Scikit-Learn Reference Cheat Sheet', description: 'Quick guide for transformers and estimators.' },
    ],
    optionalResources: [
      { id: 'res-3', title: 'SHAP Interpretability Guide', description: 'Advanced explainability library walkthrough.' },
    ],
    dimensionsOfKnowledge: {
      depthAndBreadth: 'r',
      methodologiesAndResearch: 'm',
      applicationOfKnowledge: 'm',
      communicationSkills: 'r',
      awarenessOfLimits: 'i',
      professionalCapacity: 'm',
    },
    createdBy: 'lead_mohsen_ghodrat',
    createdByName: 'Mohsen Ghodrat',
    updatedBy: 'lead_mohsen_ghodrat',
    updatedByName: 'Mohsen Ghodrat',
    createdAt: '2026-01-25T10:00:00.000Z',
    updatedAt: '2026-02-10T14:30:00.000Z',
  },
  {
    id: 'ws-ai-602',
    prefix: 'AI',
    code: '602',
    title: 'Generative AI & LLM Implementation Frameworks',
    description: 'Covers retrieval-augmented generation (RAG), vector embeddings, multi-agent workflows, and enterprise GenAI integration.',
    level: 'Professional',
    seriesId: 'series-ai-01',
    seriesName: 'AI & Emerging Tech Applications',
    status: 'Approved',
    totalDurationMinutes: 180,
    assignedDeveloperIds: ['lead_mohsen_ghodrat'],
    assignedDevelopers: [
      { id: 'lead_mohsen_ghodrat', name: 'Mohsen Ghodrat', email: 'mohsen.ghodrat@ucanwest.ca', role: 'workshop_lead' },
    ],
    learningOutcomes: [
      { id: 'wlo-4', code: 'LO1', text: 'Architect Retrieval-Augmented Generation (RAG) pipelines for internal document querying.', bloomLevel: 'Create' },
      { id: 'wlo-5', code: 'LO2', text: 'Apply structured prompt engineering and function-calling interfaces with LLMs.', bloomLevel: 'Apply' },
      { id: 'wlo-6', code: 'LO3', text: 'Evaluate hallucination rates and safety guardrails in AI agents.', bloomLevel: 'Evaluate' },
    ],
    topics: [
      {
        id: 't-4',
        order: 1,
        title: 'LLM Foundations & Vector Embeddings',
        description: 'Semantic search, tokenization, embeddings, and vector stores.',
        durationMinutes: 60,
        subtopics: [
          { id: 'st-6', title: 'Vector Database Architecture', durationMinutes: 30 },
          { id: 'st-7', title: 'Chunking Strategies & Context Windows', durationMinutes: 30 },
        ],
      },
      {
        id: 't-5',
        order: 2,
        title: 'Building Enterprise RAG Systems',
        description: 'End-to-end knowledge assistant construction with LangChain and LlamaIndex.',
        durationMinutes: 80,
        subtopics: [
          { id: 'st-8', title: 'Document Ingestion & Indexing', durationMinutes: 40 },
          { id: 'st-9', title: 'Hybrid Retrieval & Re-ranking', durationMinutes: 40 },
        ],
      },
      {
        id: 't-6',
        order: 3,
        title: 'Multi-Agent Systems & Evaluation',
        description: 'Autonomous tool-use agents and prompt benchmarking.',
        durationMinutes: 40,
        subtopics: [
          { id: 'st-10', title: 'Agentic Workflows and Function Calling', durationMinutes: 40 },
        ],
      },
    ],
    activities: [
      {
        id: 'act-3',
        order: 1,
        title: 'UCW Policy RAG Assistant Builder',
        type: 'Hands-on Lab',
        description: 'Construct a semantic QA assistant for university academic regulations.',
        estimatedMinutes: 50,
      },
    ],
    requiredResources: [
      { id: 'res-4', title: 'GenAI Developer Workbook', description: 'Step-by-step tutorial with code samples.' },
    ],
    optionalResources: [],
    dimensionsOfKnowledge: {
      depthAndBreadth: 'm',
      methodologiesAndResearch: 'm',
      applicationOfKnowledge: 'm',
      communicationSkills: 'r',
      awarenessOfLimits: 'r',
      professionalCapacity: 'm',
    },
    createdBy: 'lead_mohsen_ghodrat',
    createdByName: 'Mohsen Ghodrat',
    createdAt: '2026-02-01T11:00:00.000Z',
    updatedAt: '2026-02-12T15:00:00.000Z',
  },
  {
    id: 'ws-entr-620',
    prefix: 'ENTR',
    code: '620',
    title: 'Lean Startup Validation & Pitch Strategy',
    description: 'Formulate hypotheses, design minimum viable products (MVPs), conduct rapid customer discovery interviews, and structure winning investor pitch decks.',
    level: 'Practitioner',
    seriesId: 'series-entr-03',
    seriesName: 'Tech Entrepreneurship & Venture Design',
    status: 'Approved',
    totalDurationMinutes: 160,
    assignedDeveloperIds: ['lead_cheryl_thomas'],
    assignedDevelopers: [
      { id: 'lead_cheryl_thomas', name: 'Cheryl Thomas', email: 'cheryl.thomas@ucanwest.ca', role: 'workshop_lead' },
    ],
    learningOutcomes: [
      { id: 'wlo-9', code: 'LO1', text: 'Formulate testable business model hypotheses on Lean Canvas matrices.', bloomLevel: 'Create' },
      { id: 'wlo-10', code: 'LO2', text: 'Deliver a persuasive 3-minute venture pitch with data-driven traction metrics.', bloomLevel: 'Apply' },
    ],
    topics: [
      {
        id: 't-9',
        order: 1,
        title: 'Customer Discovery & Value Proposition Design',
        description: 'Identifying painful customer problems and designing differentiated value propositions.',
        durationMinutes: 70,
        subtopics: [
          { id: 'st-15', title: 'The Mom Test Interview Methodology', durationMinutes: 35 },
          { id: 'st-16', title: 'Value Proposition Canvas Mapping', durationMinutes: 35 },
        ],
      },
      {
        id: 't-10',
        order: 2,
        title: 'MVP Prototyping & Investor Pitch Deck Architecture',
        description: 'Building no-code MVPs and storytelling structure for pre-seed investors.',
        durationMinutes: 90,
        subtopics: [
          { id: 'st-17', title: '10-Slide Investor Deck Framework', durationMinutes: 45 },
          { id: 'st-18', title: 'Unit Economics & CAC/LTV Projections', durationMinutes: 45 },
        ],
      },
    ],
    activities: [
      {
        id: 'act-5',
        order: 1,
        title: '3-Minute Elevator Pitch Showdown',
        type: 'Presentation',
        description: 'Deliver an impromptu elevator pitch to peer panel evaluating clarity and market size.',
        estimatedMinutes: 40,
      },
    ],
    requiredResources: [
      { id: 'res-6', title: 'Lean Canvas 1-Page Template', description: 'Standard business model canvas worksheet.' },
    ],
    optionalResources: [],
    dimensionsOfKnowledge: {
      depthAndBreadth: 'r',
      methodologiesAndResearch: 'r',
      applicationOfKnowledge: 'm',
      communicationSkills: 'm',
      awarenessOfLimits: 'r',
      professionalCapacity: 'm',
    },
    createdBy: 'lead_cheryl_thomas',
    createdByName: 'Cheryl Thomas',
    createdAt: '2026-02-05T10:00:00.000Z',
    updatedAt: '2026-02-15T11:00:00.000Z',
  },
];

export const INITIAL_COURSES: Course[] = [
  {
    id: 'course-busi-654',
    prefix: 'BUSI',
    name: 'BUSI 654: Advanced Project Strategy & Venture Commercialization',
    description: 'Advanced strategic project frameworks, enterprise technology commercialization, agile product management, and cross-functional venture execution.',
    courseOutline: `Week 1: Strategic Project Leadership & Technology Commercialization
Week 2: Agile Product Architecture & Cross-Functional Governance
Week 3: Business Model Generation & Market Entry Frameworks
Week 4: Applied Machine Learning Decision Frameworks in Business
Week 5: AI Ethics, Risk Governance & Compliance
Week 6: Midterm Applied Strategy Project Milestone
Week 7: Lean Product Experimentation & MVP Validation
Week 8: Technology Commercialization & IP Strategy
Week 9: Venture Capital Financing, Cap Tables & Valuation
Week 10: Scaling Digital Ecosystems & Strategic Roadmaps
Week 11: High-Performing Cross-Functional Team Operations
Week 12: Executive Capstone Commercialization Defense`,
    seriesIds: ['series-ai-01', 'series-entr-03'],
    learningOutcomes: [
      { id: 'clo-busi-654-1', code: 'CO1', text: 'Formulate comprehensive commercialization strategies for tech-driven business initiatives.', bloomLevel: 'Create' },
      { id: 'clo-busi-654-2', code: 'CO2', text: 'Evaluate emerging AI and automation solutions for operational and strategic business optimization.', bloomLevel: 'Evaluate' },
      { id: 'clo-busi-654-3', code: 'CO3', text: 'Execute agile governance and strategic roadmap execution across high-performance project teams.', bloomLevel: 'Apply' },
    ],
    createdBy: 'lead_mohsen_ghodrat',
    createdAt: '2026-01-20T10:00:00.000Z',
    updatedAt: '2026-02-01T10:00:00.000Z',
  },
  {
    id: 'course-busi-641',
    prefix: 'BUSI',
    name: 'BUSI 641: Entrepreneurial Strategy & Venture Development',
    description: 'Systematic venture creation, lean startup methodology, customer discovery validation, unit economics modeling, and pitching high-growth business models.',
    courseOutline: `Week 1: Foundations of Entrepreneurial Opportunity Recognition
Week 2: Lean Canvas Architecture & Problem-Solution Fit
Week 3: Customer Discovery Interviews & Rapid Prototyping
Week 4: Business Model Generation & Revenue Mechanics
Week 5: Value Proposition Design & Unit Economics
Week 6: Midterm Venture Pitch & Investor Canvas
Week 7: Go-to-Market Strategy & Digital Acquisition Channels
Week 8: AI-Powered Productivity for Early-Stage Startups
Week 9: Venture Capital Financing & Cap Table Fundamentals
Week 10: Legal, Intellectual Property & Founder Governance
Week 11: Growth Metrics & Product-Market Validation
Week 12: Final Angel & VC Investor Presentation Defense`,
    seriesIds: ['series-entr-03', 'series-ai-01'],
    learningOutcomes: [
      { id: 'clo-busi-641-1', code: 'CO1', text: 'Synthesize customer discovery findings into scalable, validated lean business models.', bloomLevel: 'Create' },
      { id: 'clo-busi-641-2', code: 'CO2', text: 'Apply financial forecasting and unit economics to assess early-stage venture viability.', bloomLevel: 'Apply' },
      { id: 'clo-busi-641-3', code: 'CO3', text: 'Present persuasive venture investment proposals to seed and angel investors.', bloomLevel: 'Apply' },
    ],
    createdBy: 'lead_cheryl_thomas',
    createdAt: '2026-01-25T10:00:00.000Z',
    updatedAt: '2026-02-03T10:00:00.000Z',
  },
];

export const INITIAL_MAPPINGS: OutcomeMapping[] = [
  {
    id: 'map-1',
    courseId: 'course-busi-654',
    courseLoId: 'clo-busi-654-1',
    targetType: 'series',
    targetId: 'series-ai-01',
    targetLoId: 'slo-ai-1',
    matchLevel: 'strong',
    mappedBy: 'lead_mohsen_ghodrat',
    createdAt: '2026-02-01T12:00:00.000Z',
  },
  {
    id: 'map-2',
    courseId: 'course-busi-654',
    courseLoId: 'clo-busi-654-2',
    targetType: 'workshop',
    targetId: 'ws-ai-601',
    targetLoId: 'wlo-1',
    matchLevel: 'strong',
    mappedBy: 'lead_mohsen_ghodrat',
    createdAt: '2026-02-01T12:05:00.000Z',
  },
  {
    id: 'map-3',
    courseId: 'course-busi-654',
    courseLoId: 'clo-busi-654-3',
    targetType: 'workshop',
    targetId: 'ws-ai-602',
    targetLoId: 'wlo-4',
    matchLevel: 'partial',
    mappedBy: 'lead_mohsen_ghodrat',
    createdAt: '2026-02-01T12:10:00.000Z',
  },
  {
    id: 'map-4',
    courseId: 'course-busi-641',
    courseLoId: 'clo-busi-641-1',
    targetType: 'series',
    targetId: 'series-entr-03',
    targetLoId: 'slo-entr-1',
    matchLevel: 'strong',
    mappedBy: 'lead_cheryl_thomas',
    createdAt: '2026-02-02T12:00:00.000Z',
  },
  {
    id: 'map-5',
    courseId: 'course-busi-641',
    courseLoId: 'clo-busi-641-2',
    targetType: 'workshop',
    targetId: 'ws-entr-620',
    targetLoId: 'wlo-9',
    matchLevel: 'strong',
    mappedBy: 'lead_cheryl_thomas',
    createdAt: '2026-02-02T12:05:00.000Z',
  },
  {
    id: 'map-6',
    courseId: 'course-busi-641',
    courseLoId: 'clo-busi-641-3',
    targetType: 'series',
    targetId: 'series-entr-03',
    targetLoId: 'slo-entr-2',
    matchLevel: 'strong',
    mappedBy: 'lead_cheryl_thomas',
    createdAt: '2026-02-02T12:10:00.000Z',
  },
];

export const INITIAL_MATERIALS: Material[] = [
  {
    id: 'mat-ai-01',
    title: 'Machine Learning Classification Starter Notebook',
    fileName: 'ML_Classification_Sprint.ipynb',
    fileType: 'application/x-ipynb+json',
    fileSize: 245000,
    category: 'Activity',
    description: 'Python Google Colab starter notebook with churn dataset, preprocessing pipelines, and random forest models.',
    downloadUrl: '#',
    storagePath: 'materials/ML_Classification_Sprint.ipynb',
    workshopId: 'ws-ai-601',
    workshopTitle: 'AI 601 - Applied Machine Learning in Business',
    uploadedBy: 'lead_mohsen_ghodrat',
    uploadedByName: 'Mohsen Ghodrat',
    createdAt: '2026-02-01T10:00:00.000Z',
  },
  {
    id: 'mat-ai-02',
    title: 'Enterprise LLM Architecture & RAG Slide Deck',
    fileName: 'Enterprise_GenAI_RAG.pdf',
    fileType: 'application/pdf',
    fileSize: 4200000,
    category: 'Presentation',
    description: 'Executive slides explaining vector indexing, chunking trade-offs, and LangChain multi-agent architectures.',
    downloadUrl: '#',
    storagePath: 'materials/Enterprise_GenAI_RAG.pdf',
    workshopId: 'ws-ai-602',
    workshopTitle: 'AI 602 - Generative AI & LLM Implementation Frameworks',
    uploadedBy: 'lead_mohsen_ghodrat',
    uploadedByName: 'Mohsen Ghodrat',
    createdAt: '2026-02-02T11:00:00.000Z',
  },
  {
    id: 'mat-entr-01',
    title: 'Lean Startup MVP Pitch Deck Template',
    fileName: 'Venture_Pitch_Master.pptx',
    fileType: 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    fileSize: 3100000,
    category: 'Template',
    description: '10-slide standard pitch template for student founders pitching to angels and accelerators.',
    downloadUrl: '#',
    storagePath: 'materials/Venture_Pitch_Master.pptx',
    workshopId: 'ws-entr-620',
    workshopTitle: 'ENTR 620 - Lean Startup Validation & Pitch Strategy',
    uploadedBy: 'lead_cheryl_thomas',
    uploadedByName: 'Cheryl Thomas',
    createdAt: '2026-02-05T14:00:00.000Z',
  },
];
