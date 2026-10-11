// Syllabus explorer data — live catalogue from https://theachievers.com.np/api/goals/<slug> (Oct 2026).
// Counts match PRD section 7.3. IDs and timestamps stripped; ordering preserved.

export type SyllabusTopic = string
export type SyllabusChapter = { title: string; topics: SyllabusTopic[] }
export type SyllabusSubject = { title: string; weightage: number; chapters: SyllabusChapter[] }
export type SyllabusTrack = { slug: string; title: string; description: string | null; notice?: string; subjects: SyllabusSubject[] }

export const SYLLABUS_TRACKS: SyllabusTrack[] = [
  {
    slug: "ioe-entrance",
    title: "IOE Entrance",
    description: null,
    notice: "Physics currently lists 1 chapter against 29% weightage \u2014 full chapter list in progress (PRD S-03).",
    subjects: [
      { title: "Mathematics", weightage: 36, chapters: [
        { title: "Set, Logic and Functions", topics: ["Set, real number system, intervals", "Absolute value", "Logic, connectives, laws of logic", "Functions and types of functions", "Injective, surjective, bijective functions", "Algebraic, trigonometric, exponential, logarithmic functions", "Inverse of function", "Composite functions"] },
        { title: "Algebra", topics: ["Matrices and determinants", "Types and properties of matrices", "Inverse of a matrix", "Complex numbers", "Polynomial equations", "Sequence and series", "Permutation and Combination", "Binomial theorem", "Exponential and logarithmic series"] },
        { title: "Trigonometry", topics: ["Trigonometric equations and general values", "Inverse trigonometric functions", "Principal value", "Properties of triangles", "In-centre, ortho-centre, circum-centre", "Solution of triangles"] },
        { title: "Coordinate Geometry", topics: ["Straight lines and pair of lines", "Circles and equations of circle", "Tangent and normal", "Conic sections: Parabola, Ellipse, Hyperbola", "Standard equations and properties", "Coordinates in space", "Plane and its equation"] },
        { title: "Calculus", topics: ["Limit and continuity", "Indeterminate forms and L'Hospital's rule", "Derivatives and rules of derivatives", "Higher order derivatives", "Applications of derivative: tangent, normal, maxima, minima", "Integration and standard integrals", "Definite integral and applications", "Differential equations: order and degree", "Variable separable, homogeneous, linear, exact equations", "Integrating factor"] },
        { title: "Vectors and their Products", topics: ["Vectors in plane and space", "Algebra of vectors", "Linear combination of vectors", "Linearly dependent and independent vectors", "Scalar product of two vectors", "Vector product of two vectors", "Scalar triple product"] },
        { title: "Statistics and Probability", topics: ["Measures of location", "Measures of dispersion", "Correlation and regression", "Basic terms of probability", "Conditional and compound probability", "Additive and multiplicative rules", "Bayes' theorem", "Binomial distribution"] },
      ], },
      { title: "Physics", weightage: 29, chapters: [
        { title: "Mechanics", topics: ["Newton's Laws", "Work, Energy & Power"] },
      ], },
      { title: "Chemistry", weightage: 21, chapters: [
        { title: "Physical Chemistry", topics: ["Chemical arithmetic and stoichiometry", "Atomic mass and molecular mass", "Avogadro hypothesis and equivalent masses", "States of matter", "Atomic structure and periodic classification", "Oxidation, reduction and equilibrium", "Volumetric analysis", "Ionic equilibrium, acid, base and salt", "Electrochemistry", "Energetics, chemical kinetics, chemical bonding"] },
        { title: "Inorganic Chemistry", topics: ["Non-metals: hydrogen, oxygen, ozone, water", "Nitrogen and its compounds", "Halogen, carbon, phosphorus, sulphur", "Noble gas and environment pollution", "Metallurgical principle", "Alkali and alkaline earth metals", "Coinage metals: copper, silver, gold", "Extraction of zinc and mercury", "Iron compounds"] },
        { title: "Organic Chemistry", topics: ["Fundamental principles and purification", "Nomenclature of organic compounds", "Structural isomerism and reaction mechanism", "Hydrocarbons: alkanes, alkenes, alkynes", "Aromatic hydrocarbons", "Haloalkanes and haloarenes", "Alcohols, phenols and ethers", "Aldehydes, ketones, carboxylic acid and derivatives", "Nitro compounds and amines"] },
      ], },
      { title: "English", weightage: 14, chapters: [
        { title: "Grammar I", topics: ["Sequence of tense", "Concord / Agreement", "Direct and indirect speech", "Kinds of sentences", "Transformation of sentences"] },
        { title: "Grammar II", topics: ["Basic grammatical patterns and structures", "Conditional sentences", "Parts of speech", "Active and passive voice", "Verbals: infinitives, gerund, participles", "Punctuation and use of prepositions", "Vocabulary", "Idiomatic expressions"] },
        { title: "Phonetics", topics: ["Phonemes (vowels and consonants)", "Syllables", "Word stress", "Sentence stress"] },
        { title: "Comprehension", topics: ["Reading passages of varied topics and style", "General English comprehension", "Technical English comprehension"] },
      ], },
    ],
  },
  {
    slug: "bsc-csit",
    title: "BSc CSIT Entrance",
    description: null,
    subjects: [
      { title: "Mathematics", weightage: 25, chapters: [
        { title: "Algebra", topics: ["Set, Real Number System and Logic", "Relation and Function", "Logarithmic Function", "Matrix and Determinants", "Sequence and Series", "Complex Number", "Polynomial Equation", "System of Linear Equations", "Binomial Theorem", "Permutation and Combination"] },
        { title: "Trigonometry", topics: ["Basic Trigonometry and Circular Functions", "Trigonometric Equations and General Solutions", "Properties of Triangles"] },
        { title: "Coordinate Geometry", topics: ["Straight Lines", "Pair of Straight Lines", "Circle", "Parabola", "Ellipse", "Hyperbola", "Coordinates in Space"] },
        { title: "Calculus", topics: ["Limit and Continuity", "Derivatives (Differentiation)", "Application of Derivatives", "Anti-Derivatives (Integration)", "Application of Integration"] },
        { title: "Vectors", topics: ["Vectors and Vector Operations", "Dot and Cross Product"] },
        { title: "Probability", topics: ["Probability", "Conditional Probability", "Binomial Distribution"] },
      ], },
      { title: "Physics", weightage: 25, chapters: [
        { title: "Mechanics", topics: ["Dimensions, Error Analysis and Vectors", "Kinematics", "Newton's Laws of Motion and Friction", "Work, Energy, Power and Collision", "Circular Motion", "Gravitation", "Rotational Motion", "Simple Harmonic Motion", "Hydrostatics and Fluid Dynamics", "Surface Tension", "Elasticity"] },
        { title: "Heat and Thermodynamics", topics: ["Thermometry and Thermal Expansion", "Calorimetry and Change of State", "Hygrometry", "Kinetic Theory of Gases and Gas Laws", "Laws of Thermodynamics", "Transmission of Heat"] },
        { title: "Optics", topics: ["Reflection at Plane and Curved Mirrors", "Refraction and Total Internal Reflection", "Refraction through Prism and Dispersion", "Refraction through Lens", "Photometry", "Optical Instruments and the Human Eye"] },
        { title: "Waves", topics: ["Wave Motion and Velocity of Sound", "Stationary Waves", "Doppler's Effect", "Interference, Diffraction and Polarization"] },
        { title: "Electrostatics", topics: ["Electric Charge, Field and Potential", "Capacitors"] },
        { title: "Electricity and Magnetism", topics: ["Electric Current", "Heating Effect of Current and Thermoelectricity", "Electrical Meters", "Magnetism", "Magnetic Effect of Current", "Electromagnetic Induction", "Alternating Current"] },
        { title: "Modern Physics", topics: ["Charged Particles", "Photoelectric Effect", "Atomic Structure", "X-Rays", "Nuclear Physics and Radioactivity", "Semiconductors"] },
      ], },
      { title: "Chemistry", weightage: 25, chapters: [
        { title: "Physical Chemistry", topics: ["Language of Chemistry and Mole Concept", "Atomic Structure", "Periodic Table", "Acidimetry and Alkalimetry", "Chemical Bonding and Hybridization", "Chemical and Ionic Equilibrium", "Electrochemistry", "Acids, Bases and Salts", "Thermodynamics", "Chemical Kinetics", "Oxidation and Reduction", "States of Matter"] },
        { title: "Inorganic Chemistry", topics: ["Water", "Nitrogen", "Oxygen Family", "Sodium", "Metals and Metallurgy", "Heavy Metals", "Halogens"] },
        { title: "Organic Chemistry", topics: ["Sources and Purification of Organic Compounds", "General Characteristics of Organic Chemistry", "Nomenclature of Organic Compounds", "Functional Groups and Isomerism", "Saturated and Unsaturated Hydrocarbons", "Haloalkanes, Haloarenes and Benzene", "Alcohols, Phenols and Ethers", "Aldehydes and Ketones", "Carboxylic Acids and Derivatives", "Amines and Nitro Compounds", "Molecules of Life"] },
      ], },
      { title: "English", weightage: 15, chapters: [
        { title: "Grammar", topics: ["Articles", "Tenses", "Tag Questions", "Conditional Sentences", "Prepositions", "Subject-Verb Agreement", "Active and Passive Voice", "Direct and Indirect Speech", "Sentence Structure", "Causative Verbs", "Pronouns", "Connectives and Conjunctions"] },
        { title: "Phonetics and Pronunciation", topics: ["Sounds of English", "Stress", "Intonation"] },
        { title: "Vocabulary", topics: ["Prefix and Suffix", "Word Power", "Synonyms and Antonyms"] },
      ], },
      { title: "Computer (General IT)", weightage: 10, chapters: [
        { title: "Current Affairs", topics: [] },
        { title: "Computer Fundamentals", topics: ["Computer Fundamentals and Multimedia", "Hardware and Software", "Application Packages", "Operating Systems", "Introduction to Computers"] },
        { title: "Programming and Logic", topics: ["Programming Concepts", "Number System Conversion", "Boolean Logic"] },
        { title: "Internet and Networking", topics: ["Introduction to the Internet and WWW", "Networking", "E-mail and Social Networking", "E-Governance Services", "Digital Finance Tools", "Cyber Security"] },
      ], },
    ],
  },
  {
    slug: "ioe-msc",
    title: "IOE MSc Entrance",
    description: null,
    subjects: [
      { title: "Communication English (Section A)", weightage: 0, chapters: [
        { title: "Critical Reasoning", topics: ["Text Completion", "Sentence Equivalence", "Reading Passages", "Reading comprehension", "Critical reasoning"] },
        { title: "Error Analysis", topics: ["Error-free sentences", "Technical writing", "Proposals and reports", "Use of technical terms"] },
        { title: "Analogies", topics: ["Word relationships", "Verbal analogy"] },
      ], },
      { title: "Mathematics (Section A)", weightage: 0, chapters: [
        { title: "Basic Mathematics", topics: ["Sets and Functions", "Two-dimensional Coordinate Geometry", "Three-dimensional Coordinate Geometry"] },
        { title: "Algebra", topics: ["Polynomials", "Complex numbers", "Sequence and series", "Permutation and combination", "Equations and inequalities", "Matrices and Determinants", "Eigenvalues and Eigenvectors", "Diagonalization of matrix", "Linear Programming"] },
        { title: "Vector Analysis", topics: ["Vector Algebra", "Vectors and Scalars", "Product of vectors", "Reciprocal system", "Gradient, Curl and Divergence", "Line, surface and volume integrals"] },
        { title: "Calculus", topics: ["Limits and Continuity", "Ordinary and Partial Differentiation", "Indefinite and definite Integration", "Application of Derivatives and Anti-derivatives", "Ordinary Differential Equations"] },
        { title: "Elementary Statistics and Probability", topics: ["Statistics", "Probability"] },
        { title: "Elementary Trigonometry and Logarithm", topics: ["Trigonometry", "Logarithm"] },
        { title: "Transforms (non-Architecture streams)", topics: ["Laplace transform", "Fourier series"] },
      ], },
      { title: "Section B \u2014 Applied Science (AS)", weightage: 0, chapters: [
        { title: "Mechanical Waves & Oscillations", topics: ["Wave motion", "Velocity of wave", "Energy, power and intensity", "Stationary wave", "Echo and reverberation", "Beats", "Modes of vibration in string and pipes", "Ultrasound"] },
        { title: "Heat & Thermodynamics", topics: ["Calorimetry", "Change of state", "Conduction, convection and radiation", "Gas laws", "Kinetic theory of gas", "First and second law of thermodynamics", "Entropy", "Heat engines and refrigerators"] },
        { title: "Electromagnetic Waves & Oscillations", topics: ["Electric and magnetic fields", "Capacitors", "LR, LC, RC, LCR circuits", "Maxwell's Equations", "Gauss law", "Faraday's law", "Ampere's law", "Interference, diffraction, polarization", "Optical fibers"] },
        { title: "Modern Physics", topics: ["e and e/m", "Photoelectric effect", "Solar and photovoltaic cell", "Semiconductor and dielectric materials", "Superconductor and nanotechnology", "Bohr's theory", "Wave-particle duality", "Laser", "Radioactivity, fission, fusion", "Energy and environment"] },
        { title: "Chemistry in Daily Life", topics: ["Carbohydrates, proteins, enzymes, nucleic acids", "Drugs and classifications", "Soaps and detergents", "Organic and inorganic polymers", "Conducting polymers"] },
        { title: "Environmental Chemistry", topics: ["Water pollution", "Water pollutants", "Air pollution", "SOx, NOx, COx, ozone", "Particulates"] },
        { title: "Water", topics: ["Hardness and alkalinity", "Boiler feed water", "Sludge and scale", "Water treatment"] },
        { title: "Catalysts", topics: ["Action of catalysts", "Mechanism of catalysis"] },
        { title: "Electrochemistry", topics: ["Electrode potential", "Electrochemical and electrolytic cells", "Nernst equation", "EMF, buffer, pH", "Corrosion", "Electrochemical series"] },
        { title: "Applied Chemistry", topics: ["Fuel and combustion", "Calorific values", "Coal, petroleum, gasoline, biogas", "Explosives"] },
        { title: "3d Transition Elements, Isomerism & Instrumental Analysis", topics: ["Electronic configuration and oxidation states", "Complex and alloy formation", "Geometric and optical isomerism", "UV-Visible spectroscopy", "NMR", "Atomic absorption spectroscopy"] },
      ], },
      { title: "Section B \u2014 Architecture and Planning (AP)", weightage: 0, chapters: [
        { title: "History of Architecture", topics: ["Nepalese Architecture", "Eastern Architecture", "Western Architecture", "Contemporary Architecture"] },
        { title: "Building Material and Technology", topics: ["Brick, timber, cement, stone, aluminum, mud", "Load bearing structure", "Frame structure", "Wall, roof, floor"] },
        { title: "Building Science", topics: ["Climatology", "Thermal aspects", "Architectural lighting", "Architectural acoustics"] },
        { title: "Green Building Design", topics: ["Green building concept", "LEED, GRIHA, CASBEE rating systems", "Passive and active solar architecture", "Examples of green building"] },
        { title: "Architecture and Conservation", topics: ["Historical monuments of Nepal and World", "Architectural conservation of Nepal"] },
        { title: "Contemporary Architecture of Nepal & Building Services", topics: ["Contemporary architectural practices", "Electrical service and solar lighting", "HVAC, lift, escalator", "Solar water heating", "Water supply and sanitation"] },
        { title: "Planning", topics: ["History of planning", "Ancient town and settlement", "Urban problems in towns of Nepal", "Urban environment", "Urbanization in Nepal"] },
      ], },
      { title: "Section B \u2014 Civil & Agricultural Engineering (CA)", weightage: 0, chapters: [
        { title: "Structural Engineering", topics: ["Stresses and strains", "Bending and deflection", "Determinate structures and energy principles", "Indeterminate structures analysis", "Slope-deflection and moment-distribution", "Influence lines", "Trusses and frames", "Two and three hinged arches", "Plastic analysis"] },
        { title: "Geo-technical Engineering", topics: ["Phase relationship", "Soil classification", "Clay mineralogy", "Soil compaction and permeability", "Effective stress and seepage", "Consolidation", "Shear strength", "Slope stability", "Earth pressure theories", "Bearing capacity and foundations"] },
        { title: "Water Resources Engineering", topics: ["Fluid properties and pressure", "Fluid kinematics and dynamics", "Bernoulli's and Navier-Stokes equation", "Boundary layer theory", "Open channel flow", "Hydraulic jump", "Notches and weirs", "Hydrology and runoff", "Hydrograph analysis", "Flood routing"] },
        { title: "Transportation Engineering", topics: ["Highway alignment", "Geometric design", "Highway drainage and materials", "Traffic studies and control devices", "Road intersection design", "Road pavement", "Bridge type and site selection", "Tunnel components and methods"] },
        { title: "Water Supply & Sanitary Engineering", topics: ["Sources and quantity of water", "Water quality standards", "Intake works", "Water treatment, sedimentation, filtration, disinfection", "Distribution system", "Waste water characteristics", "Sewer design", "Sewage and sludge treatment", "Solid waste management"] },
      ], },
      { title: "Section B \u2014 Electrical Engineering (EE)", weightage: 0, chapters: [
        { title: "Basic Electrical Circuits", topics: ["Network theorems", "AC circuits and phasors", "Resonance", "Three phase circuits", "Transient response", "Pole zero plots", "Two port networks"] },
        { title: "Electrical Machines", topics: ["Electromagnets and magnetic circuits", "Faraday's law", "Transformers", "Instrument transformers", "Synchronous machine", "Induction machine", "DC generator", "DC motor"] },
        { title: "Power Systems", topics: ["Transmission line parameters and design", "Per unit system", "Distribution system", "Economics of generation", "Load flow (G-S and N-R)", "Stability studies and equal area criterion", "Compensation", "Fault calculations", "Over voltages", "Relays and circuit breakers", "Load-frequency control", "Safety engineering"] },
        { title: "Power Electronics", topics: ["Power electronic devices", "Diode, IGBT, BJT, MOSFET", "Thyristors, GTO, TRIAC", "Rectifiers", "Inverters", "Choppers"] },
      ], },
      { title: "Section B \u2014 Electronics and Computer Engineering (EC)", weightage: 0, chapters: [
        { title: "Electrical Circuit and System", topics: ["Ohm's law", "Kirchhoff's laws", "Thevenin, Norton, maximum power transfer", "Active, reactive and apparent power", "Resonance", "Transient and steady state analysis", "Two-port parameters"] },
        { title: "Electronics Circuit and System", topics: ["Integrated circuit technology", "Operational amplifier circuits", "Power supplies and voltage regulators", "Untuned and tuned amplifiers", "Oscillator circuits", "DAC and ADC conversion", "Instrumentation amplifiers", "Communication circuits", "Introduction to power electronics"] },
        { title: "Computer Architecture", topics: ["Computer architecture and organization", "Number system", "Boolean algebra and logic gates", "Combinational and sequential logic", "A/D and D/A conversion", "Memory", "Instruction set", "Operating system concepts"] },
        { title: "Computer Networks & Communication System", topics: ["Computer networks", "Analog communication theory", "Digital communication theory and system"] },
        { title: "Object Oriented Programming Language", topics: ["OOP concepts", "Introduction to C++", "Operator overloading", "Encapsulation", "Polymorphism", "Inheritance", "Templates and file handling"] },
        { title: "Discrete Structure", topics: ["Propositional and predicate logic", "Methods of proof", "Binary relations", "Finite state automata", "Recurrence relation", "Graph theory and graph algorithms"] },
      ], },
      { title: "Section B \u2014 Mechanical & Industrial Engineering (MI)", weightage: 0, chapters: [
        { title: "Thermodynamics and Heat Transfer", topics: ["Zeroth law and temperature", "First law (control mass and volume)", "Second law and entropy", "Isentropic process", "Heat engine, heat pump, refrigerator", "Carnot, Brayton, Rankine, Otto, Diesel cycles", "Vapour compression cycle", "Conduction, convection, radiation", "IC engines"] },
        { title: "Fluid Mechanics and Fluid Machine", topics: ["Fluid and flow concepts", "Flow measurement", "Continuity, momentum, Bernoulli's equation", "Viscous flow and head losses", "Water turbines", "Turbo machines", "Water pumps"] },
        { title: "Mechanics and Strength of Materials", topics: ["Particles and rigid bodies", "Equilibrium equations", "Moments and couples", "Centroid and moment of inertia", "Kinematics and kinetics", "Newton's second law", "Work-energy principle", "Impulse and momentum", "Stress and strain", "Shear force and bending moment diagram", "Mechanical design"] },
        { title: "Energy", topics: ["Conventional energy and fossil fuels", "Calorific values", "Renewable energy sources", "Solar thermal and photovoltaic energy", "Wind, biomass, geothermal, hydraulic energy", "Environmental aspects of energy"] },
        { title: "Industrial Engineering and Management", topics: ["Manufacturing processes", "Materials selection", "Elements of cost", "Production and operation management", "Production planning and control", "Plant location and layout", "Forecasting techniques", "Inventory control", "Quality assurance and control"] },
      ], },
      { title: "Section B \u2014 Geospatial / Geomatics Engineering (GE)", weightage: 0, chapters: [
        { title: "Surveying, Survey Networks and Modern Techniques", topics: ["Fundamentals of surveying", "Triangulation and trilateration", "Bathymetric survey", "Setting out of structures", "National trig points and reference surfaces", "Gravity measurement", "Photogrammetry", "Remote sensing", "Flight planning", "Image processing and interpretation"] },
        { title: "Spatial Data and Spatial Information System", topics: ["Map projections and coordinate systems", "Vector and raster data", "Topology", "Buffer, network, overlay and terrain analysis", "GIS and web GIS", "E-R and relational data model", "Spatial database management system", "SQL for spatial databases"] },
        { title: "Geodesy, GNSS and Adjustment of Observations", topics: ["Reference systems (ICRF, ITRF, ECEF, WGS84, Everest 1830)", "Time systems", "Gravity potential", "Satellite positioning and GNSS observables", "Satellite orbits and biases", "Dilution of precision", "GNSS survey techniques", "Least square adjustment", "Statistical testing"] },
        { title: "Cartography and Spatial Visualization", topics: ["Elements and types of map", "Map design and layout", "Color scheme", "Typographic guidelines", "Map production", "Web mapping", "OGC standards"] },
        { title: "Cadastre, Land Administration and Management", topics: ["Types of cadastre", "Analog vs digital cadastral system", "Cadastral survey in Nepal", "Land registration process", "Legal framework", "Land Information System (LIS)", "National land policy", "Land market and taxation", "Land tenure security", "Land conflict resolution"] },
      ], },
    ],
  },
  {
    slug: "neb-xii",
    title: "NEB Grade XII",
    description: null,
    subjects: [
      { title: "Physics", weightage: 0, chapters: [
        { title: "Mechanics", topics: ["Rotational dynamics", "Periodic motion", "Fluid statics"] },
        { title: "Heat and Thermodynamics", topics: ["First law of thermodynamics", "Second law of thermodynamics"] },
        { title: "Waves and Optics", topics: ["Wave motion", "Mechanical waves", "Waves in pipes and strings", "Acoustic phenomena", "Nature and propagation of light", "Interference", "Diffraction", "Polarization"] },
        { title: "Electricity and Magnetism", topics: ["Electrical circuits", "Thermoelectric effects", "Magnetic field", "Magnetic properties of materials", "Electromagnetic induction", "Alternating currents"] },
        { title: "Modern Physics", topics: ["Electrons", "Photons", "Semiconductor devices", "Quantization of energy", "Radioactivity and nuclear reaction", "Recent trends in physics"] },
      ], },
      { title: "Chemistry", weightage: 0, chapters: [
        { title: "Physical Chemistry", topics: ["Volumetric analysis", "Ionic equilibrium", "Chemical kinetics", "Thermodynamics", "Electrochemistry"] },
        { title: "Inorganic Chemistry", topics: ["Transition metals", "Studies of heavy metals", "Coordination compounds"] },
        { title: "Organic Chemistry", topics: ["Haloalkanes", "Haloarenes", "Alcohols", "Phenols", "Ethers", "Aldehydes and ketones", "Carboxylic acids and derivatives", "Nitro compounds", "Amines", "Organometallic compounds"] },
        { title: "Applied Chemistry", topics: ["Chemistry in the service of mankind", "Cement", "Paper and pulp", "Nuclear chemistry and applications of radioactivity"] },
      ], },
      { title: "Biology", weightage: 0, chapters: [
        { title: "Plant Anatomy (Botany)", topics: ["Plant tissues and tissue systems", "Anatomy of dicot and monocot root", "Anatomy of stem and leaf", "Secondary growth"] },
        { title: "Plant Physiology (Botany)", topics: ["Water relations", "Photosynthesis", "Respiration", "Plant hormones", "Growth and movement"] },
        { title: "Genetics (Botany)", topics: ["Genetic material DNA and RNA", "Mendelian genetics", "Linkage and crossing over", "Mutation and polyploidy"] },
        { title: "Embryology (Botany)", topics: ["Asexual and sexual reproduction", "Pollination", "Fertilization", "Development of gametophytes"] },
        { title: "Biotechnology (Botany)", topics: ["Tissue culture", "Plant breeding", "Genetic engineering", "GMOs and food safety"] },
        { title: "Animal Tissues (Zoology)", topics: ["Epithelial tissue", "Connective tissue", "Muscular tissue", "Nervous tissue"] },
        { title: "Developmental Biology (Zoology)", topics: ["Spermatogenesis", "Oogenesis", "Fertilization", "Development of frog"] },
        { title: "Human Biology (Zoology)", topics: ["Digestive system", "Respiratory system", "Circulatory system", "Excretory system", "Nervous system and sense organs", "Endocrine system", "Reproductive system"] },
        { title: "Human Population and Health Disorders (Zoology)", topics: ["Human population growth", "Health disorders", "Animal behaviour", "Environmental pollution"] },
        { title: "Applied Biology (Zoology)", topics: ["Tissue and organ transplantation", "Microbial diseases", "Immunology", "Microbial applications"] },
      ], },
      { title: "Mathematics", weightage: 0, chapters: [
        { title: "Algebra", topics: ["Permutation and combination", "Binomial theorem", "Elementary group theory", "Complex numbers", "Quadratic equation", "Mathematical induction", "Matrix-based system of linear equations"] },
        { title: "Trigonometry", topics: ["Inverse circular functions", "Trigonometric equations and general values"] },
        { title: "Analytic Geometry", topics: ["Conic sections", "Coordinates in space"] },
        { title: "Vectors", topics: ["Product of vectors", "Scalar triple product"] },
        { title: "Statistics and Probability", topics: ["Correlation and regression", "Probability"] },
        { title: "Calculus", topics: ["Derivatives", "Anti-derivatives", "Differential equations"] },
        { title: "Computational Methods", topics: ["Computing roots", "System of linear equations", "Numerical integration"] },
        { title: "Mechanics / Mathematics for Economics and Finance", topics: ["Statics", "Dynamics", "Mathematics for economics and finance"] },
      ], },
      { title: "English (Compulsory)", weightage: 0, chapters: [
        { title: "Language Development", topics: ["Reading comprehension", "Grammar in context", "Vocabulary expansion", "Writing skills", "Speaking and listening", "Thematic texts"] },
        { title: "Short Stories", topics: ["Neighbours", "A Respectable Woman", "A Devoted Son", "The Treasure in the Forest", "My Old Home", "The Half-closed Eyes of the Buddha and the Slowly Sinking Sun", "A Very Old Man with Enormous Wings"] },
        { title: "Poems", topics: ["A Day", "Every Morning I Wake", "I Was My Own Route", "The Awakening Age", "Soft Storm", "Full Moon", "Travelling Through the Dark"] },
        { title: "Essays", topics: ["On Libraries", "Marriage as a Social Institution", "Knowledge and Wisdom", "Humility", "Human Rights and the Age of Inequality", "What I Require from Life"] },
        { title: "One-Act Plays", topics: ["A Matter of Husbands", "Facing Death", "The Bull", "Trifles"] },
      ], },
    ],
  },
  {
    slug: "cee-medical",
    title: "CEE Medical Entrance",
    description: "Medical (MBBS/BDS) entrance preparation \u2014 Physics, Chemistry, Biology, MAT.",
    subjects: [
      { title: "Physics", weightage: 25, chapters: [
        { title: "Mechanics", topics: ["Vectors", "Kinematics", "Laws of motion", "Work, energy and power", "Circular and rotational motion", "Gravitation", "Elasticity", "Fluid mechanics and surface tension"] },
        { title: "Heat and Thermodynamics", topics: ["Temperature and thermometry", "Thermal expansion", "Calorimetry and heat transfer", "Gas laws and kinetic theory", "Laws of thermodynamics"] },
        { title: "Waves and Optics", topics: ["Wave motion", "Sound waves", "Reflection and mirrors", "Refraction and lenses", "Dispersion and optical instruments", "Interference", "Diffraction", "Polarization"] },
        { title: "Electrostatics and Capacitors", topics: ["Electric charge and field", "Electric potential", "Gauss's law", "Capacitors and capacitance", "Dielectrics"] },
        { title: "Current Electricity and Magnetism", topics: ["Ohm's law and resistance", "DC circuits and Kirchhoff's laws", "Heating effect of current", "Magnetic effect of current", "Electromagnetic induction", "Alternating current"] },
        { title: "Modern and Nuclear Physics", topics: ["Photoelectric effect", "Atomic models and spectra", "X-rays", "Radioactivity", "Nuclear physics", "Semiconductor devices and electronics", "Particle physics", "Sources of energy and universe"] },
      ], },
      { title: "Chemistry", weightage: 25, chapters: [
        { title: "General and Physical Chemistry", topics: ["Atomic structure", "States of matter", "Solutions and colligative properties", "Chemical kinetics", "Chemical equilibrium", "Ionic equilibrium and pH", "Thermodynamics and thermochemistry", "Electrochemistry"] },
        { title: "Inorganic Chemistry", topics: ["Periodic table and periodicity", "Chemical bonding", "s-block elements", "p-block elements", "d-block and f-block elements", "Coordination compounds", "Metallurgy"] },
        { title: "Organic Chemistry", topics: ["Basic concepts and isomerism", "Hydrocarbons", "Haloalkanes and haloarenes", "Alcohols and phenols", "Aldehydes and ketones", "Carboxylic acids", "Amines and nitrogen compounds", "Reaction mechanisms", "Biomolecules", "Polymers"] },
        { title: "Applied and Analytical Chemistry", topics: ["Environmental chemistry", "Industrial chemistry", "Qualitative analysis", "Quantitative analysis", "Stoichiometry"] },
      ], },
      { title: "Botany", weightage: 20, chapters: [
        { title: "Basic Components of Life", topics: ["Carbohydrates", "Lipids", "Proteins", "Enzymes", "Minerals"] },
        { title: "Biodiversity", topics: ["Classification systems", "Monera and Virus", "Fungi", "Algae", "Bryophytes", "Pteridophytes", "Gymnosperms", "Angiosperms", "Medicinal plants of Nepal"] },
        { title: "Ecology and Vegetation", topics: ["Ecosystem", "Biogeochemical cycles", "Greenhouse effect and acid rain", "Plant adaptation", "Ecological succession", "Forests of Nepal"] },
        { title: "Cell Biology", topics: ["Cell theory", "Cell organelles", "Cell cycle", "Mitosis", "Meiosis"] },
        { title: "Genetics", topics: ["DNA and RNA structure", "DNA replication", "Mendelian genetics", "Linkage and crossing over", "Sex-linked inheritance", "Mutation", "Genetic disorders"] },
        { title: "Plant Anatomy", topics: ["Plant tissues", "Vascular bundles", "Monocot and dicot anatomy", "Secondary growth"] },
        { title: "Plant Physiology and Developmental Botany", topics: ["Plant water relations", "Transpiration", "Ascent of sap", "Photosynthesis", "Respiration", "Plant growth regulators"] },
        { title: "Applied Botany", topics: ["Plant breeding", "Biofertilizers", "Plant tissue culture", "Biotechnology applications"] },
      ], },
      { title: "Zoology", weightage: 20, chapters: [
        { title: "Evolutionary Biology", topics: ["Origin of life", "Oparin-Haldane theory", "Miller-Urey experiment", "Evidence of evolution", "Lamarckism", "Darwinism and Neo-Darwinism", "Human evolution"] },
        { title: "Animal Diversity and Classification", topics: ["Protozoa to Chordata", "Diagnostic features", "Classification basis", "Representative examples"] },
        { title: "Animal Tissues and Histology", topics: ["Epithelial tissue", "Connective tissue", "Muscular tissue", "Nervous tissue"] },
        { title: "Study of Selected Animals", topics: ["Plasmodium and malaria", "Earthworm morphology and physiology", "Frog morphology and body systems"] },
        { title: "Human Biology and Physiology", topics: ["Digestive system", "Respiratory system", "Circulatory system", "Excretory system", "Nervous system", "Sense organs (eye and ear)", "Endocrine system", "Reproductive system and disorders"] },
        { title: "Microbial Diseases and Immunology", topics: ["Typhoid", "Tuberculosis", "HIV/AIDS", "Types of immunity", "Vaccines"] },
        { title: "Medical Technology and Applied Biology", topics: ["In-vitro fertilization (IVF)", "Organ transplantation", "Medical applications of zoology"] },
        { title: "Biota, Environment and Conservation", topics: ["Animal behavior", "Environmental pollution", "Animal adaptation", "IUCN and conservation", "Conservation in Nepal"] },
      ], },
      { title: "Mental Agility Test (MAT)", weightage: 10, chapters: [
        { title: "Verbal Reasoning", topics: ["Analogies", "Classification", "Series", "Coding-decoding", "Word relationships"] },
        { title: "Numerical Reasoning", topics: ["Number series", "Arithmetic reasoning", "Data interpretation", "Numerical analogies"] },
        { title: "Logical Sequencing", topics: ["Logical sequences", "Syllogisms", "Statement and conclusion", "Direction sense", "Blood relations"] },
        { title: "Spatial and Abstract Reasoning", topics: ["Spatial relations", "Pattern completion", "Figure series", "Mirror and water images", "Embedded figures"] },
      ], },
    ],
  },
];

export function trackCounts(t: SyllabusTrack) {
  const chapters = t.subjects.reduce((a, s) => a + s.chapters.length, 0)
  const topics = t.subjects.reduce((a, s) => a + s.chapters.reduce((x, c) => x + c.topics.length, 0), 0)
  return { subjects: t.subjects.length, chapters, topics }
}
