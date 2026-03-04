// NSW HSC Mathematics Syllabi — Topics & Sub-topics
// Source: NESA NSW Education Standards Authority

const syllabusData = {
    "Mathematics Advanced": {
        code: "MA",
        color: "primary",
        years: {
            "Year 11": [
                {
                    code: "MA-F1",
                    name: "Working with Functions",
                    parent: "Functions",
                    subtopics: [
                        { code: "F1.1", name: "Algebraic Techniques" },
                        { code: "F1.2", name: "Introduction to Functions" },
                        { code: "F1.3", name: "Linear, Quadratic & Cubic Functions" },
                        { code: "F1.4", name: "Further Functions & Relations" },
                    ],
                },
                {
                    code: "MA-T1",
                    name: "Trigonometry & Measure of Angles",
                    parent: "Trigonometric Functions",
                    subtopics: [
                        { code: "T1.1", name: "Trigonometry" },
                        { code: "T1.2", name: "Radians" },
                    ],
                },
                {
                    code: "MA-T2",
                    name: "Trigonometric Functions & Identities",
                    parent: "Trigonometric Functions",
                    subtopics: [
                        { code: "T2.1", name: "Trigonometric Functions & Graphs" },
                        { code: "T2.2", name: "Trigonometric Identities" },
                    ],
                },
                {
                    code: "MA-C1",
                    name: "Introduction to Differentiation",
                    parent: "Calculus",
                    subtopics: [
                        { code: "C1.1", name: "Gradients of Tangents" },
                        { code: "C1.2", name: "Difference Quotients" },
                        { code: "C1.3", name: "The Derivative Function & Its Graph" },
                        { code: "C1.4", name: "Calculating with Derivatives" },
                    ],
                },
                {
                    code: "MA-E1",
                    name: "Logarithms & Exponentials",
                    parent: "Exponential & Logarithmic Functions",
                    subtopics: [
                        { code: "E1.1", name: "Introducing Logarithms" },
                        { code: "E1.2", name: "Logarithmic Laws & Applications" },
                        { code: "E1.3", name: "The Exponential Function & Natural Logarithms" },
                        { code: "E1.4", name: "Graphs & Applications of Exp/Log Functions" },
                    ],
                },
                {
                    code: "MA-S1",
                    name: "Probability & Discrete Probability Distributions",
                    parent: "Statistical Analysis",
                    subtopics: [
                        { code: "S1.1", name: "Probability & Venn Diagrams" },
                        { code: "S1.2", name: "Discrete Probability Distributions" },
                    ],
                },
            ],
            "Year 12": [
                {
                    code: "MA-F2",
                    name: "Graphing Techniques",
                    parent: "Functions",
                    subtopics: [
                        { code: "F2.1", name: "Graphing Techniques Using Calculus" },
                        { code: "F2.2", name: "Transformations & Symmetry" },
                    ],
                },
                {
                    code: "MA-T3",
                    name: "Trigonometric Functions & Graphs",
                    parent: "Trigonometric Functions",
                    subtopics: [
                        { code: "T3.1", name: "Trigonometric Equations" },
                        { code: "T3.2", name: "Trigonometric Graphs & Applications" },
                    ],
                },
                {
                    code: "MA-C2",
                    name: "Differential Calculus",
                    parent: "Calculus",
                    subtopics: [
                        { code: "C2.1", name: "Differentiation of Trig, Exp & Log Functions" },
                        { code: "C2.2", name: "Rules of Differentiation" },
                    ],
                },
                {
                    code: "MA-C3",
                    name: "Applications of Differentiation",
                    parent: "Calculus",
                    subtopics: [
                        { code: "C3.1", name: "The First & Second Derivatives" },
                        { code: "C3.2", name: "Applications of the Derivative" },
                    ],
                },
                {
                    code: "MA-C4",
                    name: "Integral Calculus",
                    parent: "Calculus",
                    subtopics: [
                        { code: "C4.1", name: "The Anti-Derivative" },
                        { code: "C4.2", name: "Areas & the Definite Integral" },
                    ],
                },
                {
                    code: "MA-M1",
                    name: "Modelling Financial Situations",
                    parent: "Financial Mathematics",
                    subtopics: [
                        { code: "M1.1", name: "Modelling Investments & Loans" },
                        { code: "M1.2", name: "Arithmetic Sequences & Series" },
                        { code: "M1.3", name: "Geometric Sequences & Series" },
                        { code: "M1.4", name: "Financial Applications of Sequences & Series" },
                    ],
                },
                {
                    code: "MA-S2",
                    name: "Descriptive Statistics & Bivariate Data",
                    parent: "Statistical Analysis",
                    subtopics: [
                        { code: "S2.1", name: "Data & Summary Statistics" },
                        { code: "S2.2", name: "Bivariate Data Analysis" },
                    ],
                },
                {
                    code: "MA-S3",
                    name: "Random Variables",
                    parent: "Statistical Analysis",
                    subtopics: [
                        { code: "S3.1", name: "Continuous Random Variables" },
                        { code: "S3.2", name: "The Normal Distribution" },
                    ],
                },
            ],
        },
    },

    "Extension 1": {
        code: "ME",
        color: "secondary",
        years: {
            "Year 11": [
                {
                    code: "ME-F1",
                    name: "Further Work with Functions",
                    parent: "Functions",
                    subtopics: [
                        { code: "F1.1", name: "Graphical Relationships" },
                        { code: "F1.2", name: "Inequalities" },
                        { code: "F1.3", name: "Inverse Functions" },
                        { code: "F1.4", name: "Parametric Form of a Function" },
                    ],
                },
                {
                    code: "ME-T1",
                    name: "Inverse Trigonometric Functions",
                    parent: "Trigonometric Functions",
                    subtopics: [
                        { code: "T1.1", name: "Inverse Trigonometric Functions" },
                        { code: "T1.2", name: "Further Trigonometric Identities" },
                    ],
                },
                {
                    code: "ME-C1",
                    name: "Rates of Change",
                    parent: "Calculus",
                    subtopics: [
                        { code: "C1.1", name: "Rates of Change with Respect to Time" },
                        { code: "C1.2", name: "Exponential Growth & Decay" },
                        { code: "C1.3", name: "Related Rates of Change" },
                    ],
                },
                {
                    code: "ME-A1",
                    name: "Working with Combinatorics",
                    parent: "Combinatorics",
                    subtopics: [
                        { code: "A1.1", name: "Permutations & Combinations" },
                        { code: "A1.2", name: "The Binomial Expansion & Pascal's Triangle" },
                    ],
                },
            ],
            "Year 12": [
                {
                    code: "ME-P1",
                    name: "Proof by Mathematical Induction",
                    parent: "Proof",
                    subtopics: [
                        { code: "P1.1", name: "Mathematical Induction" },
                    ],
                },
                {
                    code: "ME-V1",
                    name: "Introduction to Vectors",
                    parent: "Vectors",
                    subtopics: [
                        { code: "V1.1", name: "Introduction to Vectors" },
                        { code: "V1.2", name: "Further Operations with Vectors" },
                        { code: "V1.3", name: "Projectile Motion" },
                    ],
                },
                {
                    code: "ME-T2",
                    name: "Trigonometric Equations",
                    parent: "Trigonometric Functions",
                    subtopics: [
                        { code: "T2.1", name: "Trigonometric Equations" },
                        { code: "T2.2", name: "Trigonometric Proofs" },
                    ],
                },
                {
                    code: "ME-C2",
                    name: "Further Calculus",
                    parent: "Calculus",
                    subtopics: [
                        { code: "C2.1", name: "Further Integration" },
                        { code: "C2.2", name: "Integration by Substitution" },
                    ],
                },
                {
                    code: "ME-C3",
                    name: "Differential Equations",
                    parent: "Calculus",
                    subtopics: [
                        { code: "C3.1", name: "Differential Equations" },
                        { code: "C3.2", name: "Modelling with First-Order Differential Equations" },
                    ],
                },
                {
                    code: "ME-S1",
                    name: "The Binomial Distribution",
                    parent: "Statistical Analysis",
                    subtopics: [
                        { code: "S1.1", name: "Bernoulli & Binomial Distributions" },
                        { code: "S1.2", name: "Normal Approximation for the Sample Proportion" },
                    ],
                },
            ],
        },
    },

    "Extension 2": {
        code: "MEX",
        color: "accent",
        years: {
            "Year 12": [
                {
                    code: "MEX-P1",
                    name: "The Nature of Proof",
                    parent: "Proof",
                    subtopics: [
                        { code: "P1.1", name: "The Language of Proof" },
                        { code: "P1.2", name: "Proof by Contradiction & Equivalence" },
                    ],
                },
                {
                    code: "MEX-P2",
                    name: "Further Proof by Mathematical Induction",
                    parent: "Proof",
                    subtopics: [
                        { code: "P2.1", name: "Mathematical Induction (Divisibility & Inequality)" },
                        { code: "P2.2", name: "Induction on Sequences & Series" },
                    ],
                },
                {
                    code: "MEX-V1",
                    name: "Further Work with Vectors",
                    parent: "Vectors",
                    subtopics: [
                        { code: "V1.1", name: "3D Vectors & Geometric Proofs" },
                        { code: "V1.2", name: "Vector Equation of a Line" },
                    ],
                },
                {
                    code: "MEX-N1",
                    name: "Introduction to Complex Numbers",
                    parent: "Complex Numbers",
                    subtopics: [
                        { code: "N1.1", name: "Arithmetic of Complex Numbers" },
                        { code: "N1.2", name: "Geometric Representation" },
                        { code: "N1.3", name: "Polar (Modulus-Argument) Form" },
                    ],
                },
                {
                    code: "MEX-N2",
                    name: "Using Complex Numbers",
                    parent: "Complex Numbers",
                    subtopics: [
                        { code: "N2.1", name: "De Moivre's Theorem & Applications" },
                        { code: "N2.2", name: "Complex Numbers & Polynomials" },
                    ],
                },
                {
                    code: "MEX-C1",
                    name: "Further Integration",
                    parent: "Calculus",
                    subtopics: [
                        { code: "C1.1", name: "Integration by Parts" },
                        { code: "C1.2", name: "Recurrence Relations & Partial Fractions" },
                    ],
                },
                {
                    code: "MEX-M1",
                    name: "Applications of Calculus to Mechanics",
                    parent: "Mechanics",
                    subtopics: [
                        { code: "M1.1", name: "Simple Harmonic Motion" },
                        { code: "M1.2", name: "Modelling Motion Without Resistance" },
                        { code: "M1.3", name: "Resisted Motion" },
                    ],
                },
            ],
        },
    },

    "Standard 2": {
        code: "MS",
        color: "primary",
        years: {
            "Year 11": [
                {
                    code: "MS-A1",
                    name: "Formulae & Equations",
                    parent: "Algebra",
                    subtopics: [
                        { code: "A1.1", name: "Substitution into Formulae" },
                        { code: "A1.2", name: "Solving Linear Equations" },
                    ],
                },
                {
                    code: "MS-A2",
                    name: "Linear Relationships",
                    parent: "Algebra",
                    subtopics: [
                        { code: "A2.1", name: "Modelling with Linear Functions" },
                        { code: "A2.2", name: "Simultaneous Linear Equations" },
                    ],
                },
                {
                    code: "MS-M1",
                    name: "Applications of Measurement",
                    parent: "Measurement",
                    subtopics: [
                        { code: "M1.1", name: "Practicalities of Measurement" },
                        { code: "M1.2", name: "Perimeter, Area & Volume" },
                        { code: "M1.3", name: "Units of Energy & Mass" },
                    ],
                },
                {
                    code: "MS-M2",
                    name: "Working with Time",
                    parent: "Measurement",
                    subtopics: [
                        { code: "M2.1", name: "Time Calculations & Latitude/Longitude" },
                    ],
                },
                {
                    code: "MS-F1",
                    name: "Money Matters",
                    parent: "Financial Mathematics",
                    subtopics: [
                        { code: "F1.1", name: "Interest & Depreciation" },
                        { code: "F1.2", name: "Earning & Managing Money" },
                        { code: "F1.3", name: "Budgeting & Household Expenses" },
                    ],
                },
                {
                    code: "MS-S1",
                    name: "Data Analysis",
                    parent: "Statistical Analysis",
                    subtopics: [
                        { code: "S1.1", name: "Classifying & Representing Data" },
                        { code: "S1.2", name: "Summary Statistics" },
                    ],
                },
                {
                    code: "MS-S2",
                    name: "Relative Frequency & Probability",
                    parent: "Statistical Analysis",
                    subtopics: [
                        { code: "S2.1", name: "Relative Frequency" },
                        { code: "S2.2", name: "Probability & Venn Diagrams" },
                    ],
                },
            ],
            "Year 12": [
                {
                    code: "MS-A3",
                    name: "Types of Relationships",
                    parent: "Algebra",
                    subtopics: [
                        { code: "A3.1", name: "Simultaneous Equations (Graphical)" },
                        { code: "A3.2", name: "Non-Linear Relationships" },
                    ],
                },
                {
                    code: "MS-M3",
                    name: "Right-Angled Trigonometry",
                    parent: "Measurement",
                    subtopics: [
                        { code: "M3.1", name: "Trigonometric Ratios" },
                        { code: "M3.2", name: "Angles of Elevation & Depression" },
                    ],
                },
                {
                    code: "MS-M4",
                    name: "Non-Right-Angled Trigonometry",
                    parent: "Measurement",
                    subtopics: [
                        { code: "M4.1", name: "Sine & Cosine Rules" },
                        { code: "M4.2", name: "Area of a Triangle" },
                    ],
                },
                {
                    code: "MS-M5",
                    name: "Rates & Ratios",
                    parent: "Measurement",
                    subtopics: [
                        { code: "M5.1", name: "Rates" },
                        { code: "M5.2", name: "Scale Drawings" },
                    ],
                },
                {
                    code: "MS-F2",
                    name: "Investments & Loans",
                    parent: "Financial Mathematics",
                    subtopics: [
                        { code: "F2.1", name: "Compound Interest Investments" },
                        { code: "F2.2", name: "Reducing Balance Loans" },
                    ],
                },
                {
                    code: "MS-F3",
                    name: "Annuities",
                    parent: "Financial Mathematics",
                    subtopics: [
                        { code: "F3.1", name: "Future & Present Value of Annuities" },
                        { code: "F3.2", name: "Using Technology for Financial Calculations" },
                    ],
                },
                {
                    code: "MS-S3",
                    name: "Bivariate Data Analysis",
                    parent: "Statistical Analysis",
                    subtopics: [
                        { code: "S3.1", name: "Scatterplots & Correlation" },
                        { code: "S3.2", name: "Line of Best Fit & Predictions" },
                    ],
                },
                {
                    code: "MS-S4",
                    name: "The Normal Distribution",
                    parent: "Statistical Analysis",
                    subtopics: [
                        { code: "S4.1", name: "The Normal Distribution & z-Scores" },
                        { code: "S4.2", name: "Empirical Rule & Applications" },
                    ],
                },
                {
                    code: "MS-N1",
                    name: "Network Concepts",
                    parent: "Networks",
                    subtopics: [
                        { code: "N1.1", name: "Networks & Paths" },
                        { code: "N1.2", name: "Shortest Paths & Spanning Trees" },
                    ],
                },
                {
                    code: "MS-N2",
                    name: "Critical Path Analysis",
                    parent: "Networks",
                    subtopics: [
                        { code: "N2.1", name: "Activity Charts & Forward/Backward Scanning" },
                        { code: "N2.2", name: "Float Times & Project Management" },
                    ],
                },
            ],
        },
    },
};

export default syllabusData;
