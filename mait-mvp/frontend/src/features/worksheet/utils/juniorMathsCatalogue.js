import references from './juniorMathsReferences.json';

// MyAITutor topic summaries, not NESA outcome or content-point quotations.
// A record represents a focus-area part, not every teaching point within it.
const summaries = {
  'Stage 1': [
    ['fa26b2cd40', 'faabd017f2', 'Counting collections and building place value'],
    ['fa83041eb2', 'fa7e3d8973', 'Joining, taking away and comparing amounts'],
    ['faa8aa1c99', 'fa2c27951b', 'Equal groups, sharing and repeated counting'],
    ['fa5e736769', 'fa962d924b', 'Position, length and turning'],
    ['fa9a45594a', 'fa922969e6', 'Exploring flat shapes and covering surfaces'],
    ['fa78d710fb', 'fa75d47d70', 'Building with solids and comparing capacity'],
    ['fa0ed3a23d', 'fa46c94636', 'Comparing mass and making sense of time'],
    ['fab6161915', 'fae90cf162', 'Collecting answers and reading simple displays'],
    ['fa2008eee7', 'fa8fa9fb8a', 'Talking about possible and likely events'],
  ],
  'Stage 2': [
    ['fa3867d7b8', 'fa1dbb9271', 'Place value with whole numbers and decimals'],
    ['fa361e2379', 'fa62ff3cf3', 'Addition, subtraction and missing values'],
    ['fa3feef933', 'fad59f2055', 'Multiplication, division and number patterns'],
    ['fab1a01bf6', 'fabf1cf43b', 'Equal parts, fraction models and number lines'],
    ['fae78c0853', 'fa620a8f93', 'Maps, length measurements and angles'],
    ['fae82874e2', 'fa880c6188', 'Shape features, symmetry and area models'],
    ['fa8065c643', 'faa2ba21e4', 'Solid models, capacity and volume units'],
    ['fa1318ad38', 'fa6271aa71', 'Mass measurements, clocks and duration'],
    ['fae1144fe0', 'fa4a0f3cbc', 'Organising survey results and reading graphs'],
    ['fa3b99508c', 'face5c0f2c', 'Comparing chances through simple experiments'],
  ],
  'Stage 3': [
    ['fa87632ef7', 'fa0a18f458', 'Number size, place value and decimal representations'],
    ['faf843e1ab', 'fa2ebf6217', 'Efficient addition and subtraction strategies'],
    ['fafab309e2', 'fa1ff4d43b', 'Multiplication and division strategies for larger numbers'],
    ['fac8227f10', 'fa1618803c', 'Fraction size, equivalence and calculations'],
    ['fa35c41b81', 'fae314fde1', 'Coordinates, distance measurements and angle problems'],
    ['fad7c142c4', 'fa0dfe5fec', 'Classifying shapes and calculating areas'],
    ['fa51e61164', 'fa89ed4224', 'Connecting solid models, volume and capacity'],
    ['fa7e80b308', 'faebab48ca', 'Mass conversions and elapsed-time problems'],
    ['fa934b5e3a', 'fa0c228e92', 'Choosing data displays and interpreting results'],
    ['faf834e5b5', 'fa6dbbaafc', 'Experimental chance and numerical probability'],
  ],
};

const secondary = [
  ['fa783c951a', 'Working with positive and negative integers'],
  ['fad6ecbfc4', 'Calculations and conversions with fractions, decimals and percentages'],
  ['faf41ae0d9', 'Proportional comparisons using ratios and rates'],
  ['fafcecf0db', 'Building and simplifying algebraic expressions'],
  ['fa5d58f980', 'Powers and exponent rules'],
  ['fa2b36d99b', 'Finding unknowns in equations'],
  ['fa6ebf0c74', 'Tables, rules and straight-line graphs'],
  ['fa498c8819', 'Measuring boundaries and circle circumference'],
  ['facc79fb0a', 'Finding right-triangle sides with Pythagoras'],
  ['fa3b012530', 'Calculating areas of flat shapes'],
  ['fa81d78b9c', 'Measuring three-dimensional space with volume'],
  ['fa7949a8dc', 'Using angle facts to find missing angles'],
  ['fa77304c54', 'Reasoning about triangles and quadrilaterals'],
  ['fa1961f47c', 'Sorting data and choosing suitable displays'],
  ['faf3cc6dd1', 'Describing a dataset using centre and spread'],
  ['faeb7df99f', 'Listing outcomes and calculating chance'],
  ['facb3aa952', 'Budgets, earnings and simple interest'],
  ['fab73ea3dd', 'Repeated financial growth and depreciation'],
  ['fa0f9951b1', 'Expanding expressions and numerical-denominator algebraic fractions'],
  ['fad97db224', 'Algebraic powers and zero or negative numerical exponents'],
  ['fa0e151fb2', 'Multi-step linear equations with a fraction'],
  ['fa7f703ea7', 'Coordinate geometry: midpoint, slope and distance'],
  ['fa528f5a54', 'Straight lines in slope-intercept form'],
  ['fafee6f5b1', 'Connecting quadratic and exponential rules to graphs'],
  ['fa9dbfae94', 'Comparing parabolas and exponential curves'],
  ['fa54356e3c', 'Scientific notation and precision in measurement'],
  ['fac59b13b0', 'Right-triangle problems using sine, cosine and tangent'],
  ['fad171c0a4', 'Bearings and viewing angles with trigonometry'],
  ['fad37504e5', 'Composite areas and prism surface areas'],
  ['fab476201c', 'Volumes built from prisms and cylinders'],
  ['fa6d9fa8bc', 'Scale drawings and similar shapes'],
  ['fa0b12861f', 'Comparing groups with graphs and summary statistics'],
  ['fac65551f8', 'Exploring relationships between two data variables'],
  ['fadd685070', 'Multi-step chance experiments and simulations'],
  ['fa9b67bc3e', 'Direct and inverse proportion models'],
  ['fa90736232', 'Reading and drawing rate-of-change graphs'],
  ['fa0ac6000c', 'Factorisation and algebraic fractions with powers'],
  ['fa7879a3d5', 'Choosing strategies for complex algebraic fractions'],
  ['fa24d5bd5b', 'Negative exponents with algebraic bases'],
  ['fa8d9baa84', 'Surds and fractional powers'],
  ['fab83522c4', 'Further equation-solving techniques'],
  ['fa587a4c87', 'Advanced linear, quadratic and simultaneous equations'],
  ['fab720e184', 'Line equations and coordinate transformations'],
  ['fa633cd425', 'Transforming and comparing non-linear graphs'],
  ['fac28d3aef', 'Polynomial calculations, graphs and factor tests'],
  ['fa0379c0d0', 'Logarithm rules and equations'],
  ['fa4ba33ef2', 'Function notation and graphing inequalities'],
  ['fa381c0ce0', 'Non-right triangles and spatial trigonometry'],
  ['fa632cab9d', 'Trigonometric functions and equations'],
  ['faa621ba82', 'Surface areas of curved, pointed and composite solids'],
  ['fa7092943a', 'Volumes involving cones, pyramids and spheres'],
  ['fa222c8206', 'Triangle congruence and similarity tests'],
  ['fad76393f0', 'Writing proofs about triangles and plane shapes'],
  ['fa6eb2f57b', 'Circle theorems and geometric proof'],
  ['fae172f5e1', 'Routes, connections and Eulerian networks'],
  ['fa134ba697', 'Designing and evaluating a statistical investigation'],
  ['fa45bd1262', 'Conditional chance with tables and Venn diagrams'],
];

const makeRecord = (focusId, summary, part = '') => {
  const ref = references.focusAreas[focusId];
  const pathway = ref.stage === 'Stage 5' && ref.outcomeCodes.some(code => code.includes('-P-')) ? 'Path' : 'Core';
  return {
    ...ref, sourceId: focusId, source: references.syllabusVersion,
    syllabusVersion: references.syllabusVersion, part,
    pathway: part ? null : pathway,
    label: `${summary}${part ? ` — Part ${part}` : pathway === 'Path' ? ' — Path' : ''}`,
    textType: 'original-topic-summary',
  };
};
const records = [
  ...Object.values(summaries).flatMap(items => items.flatMap(([a, b, summary]) => [makeRecord(a, summary, 'A'), makeRecord(b, summary, 'B')])),
  ...secondary.map(([id, summary]) => makeRecord(id, summary)),
];

export function juniorMathsRecords(stage) {
  return records.filter(record => stage.startsWith(`${record.stage} (`));
}

export const juniorMathsNotice = 'MyAITutor topic summaries with references to Mathematics K–10 (2022). These are broad topic choices, not official wording or every syllabus content point. Parts A/B are not fixed year allocations; choose tasks to suit prior learning. Stage 5 Paths are optional selections and may be taught earlier where appropriate.';
