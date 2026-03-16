export class MathRouter {
  /**
   * Classify user input against safe deterministic mathematical heuristics.
   * If matched, returns structured tool payload. Otherwise null.
   * @param {string} text 
   * @returns {Object|null}
   */
  static classify(text) {
    const t = text.trim().toLowerCase().replace(/\?+$/, '');
    
    // 1. Derivative
    const derivMatch = userTextDeriv(t);
    if (derivMatch) return derivMatch;

    // 2. Simplify
    const simpMatch = userTextSimplify(t);
    if (simpMatch) return simpMatch;

    // 3. Expand
    const expMatch = userTextExpand(t);
    if (expMatch) return expMatch;

    // 4. Midpoint
    const midMatch = userTextMidpoint(t);
    if (midMatch) return midMatch;

    // 5. Distance
    const distMatch = userTextDistance(t);
    if (distMatch) return distMatch;

    // 6. Gradient/Slope
    const slopeMatch = userTextSlope(t);
    if (slopeMatch) return slopeMatch;

    // 7. Arithmetic Evaluation (e.g., "What is 5 + 5?", "Calculate 12/4")
    const evalMatch = userTextEval(t);
    if (evalMatch) return evalMatch;

    return null; // Route to general SLM chat
  }
}

// ------ HEURISTICS ------

function userTextDeriv(t) {
  // e.g. "what is the derivative of x^2", "differentiate 3x^2"
  const m = t.match(/(?:differentiate|derivative(?:\s*of)?)\s+([a-z0-9\+\-\*\/\^\(\)\s\.]+)/i);
  if (m) {
    const expr = cleanExpr(m[1]);
    if (!expr) return null;
    return { task: 'derivative', expression: expr, variable: guessVariable(expr) };
  }
  return null;
}

function userTextSimplify(t) {
  const m = t.match(/(?:simplify)\s+([a-z0-9\+\-\*\/\^\(\)\s\.]+)/i);
  if (m) {
    const expr = cleanExpr(m[1]);
    if (!expr) return null;
    return { task: 'simplify', expression: expr };
  }
  return null;
}

function userTextExpand(t) {
  const m = t.match(/(?:expand)\s+([a-z0-9\+\-\*\/\^\(\)\s\.]+)/i);
  if (m) {
    const expr = cleanExpr(m[1]);
    if (!expr) return null;
    return { task: 'expand', expression: expr };
  }
  return null;
}

function parsePoints(t) {
  // Looks for two points like (x,y) and (a,b)
  const pts = [...t.matchAll(/\(\s*([+-]?\d*(?:\.\d+)?)\s*,\s*([+-]?\d*(?:\.\d+)?)\s*\)/g)];
  if (pts.length === 2) {
    return {
      p1: [parseFloat(pts[0][1]), parseFloat(pts[0][2])],
      p2: [parseFloat(pts[1][1]), parseFloat(pts[1][2])]
    };
  }
  return null;
}

function userTextMidpoint(t) {
  if (t.includes('midpoint')) {
    const pts = parsePoints(t);
    if (pts) return { task: 'midpoint', point1: pts.p1, point2: pts.p2 };
  }
  return null;
}

function userTextDistance(t) {
  if (t.includes('distance')) {
    const pts = parsePoints(t);
    if (pts) return { task: 'distance', point1: pts.p1, point2: pts.p2 };
  }
  return null;
}

function userTextSlope(t) {
  if (t.includes('gradient') || t.includes('slope')) {
    const pts = parsePoints(t);
    if (pts) return { task: 'gradient', point1: pts.p1, point2: pts.p2 };
  }
  return null;
}

function userTextEval(t) {
  const m = t.match(/^(?:what is|calculate|evaluate)?\s*([a-z0-9\+\-\*\/\^\(\)\s\.]+)$/i);
  if (m) {
    const expr = cleanExpr(m[1]);
    
    // Ensure it has at least one number or math operator, to avoid routing normal english sentences.
    if (!/[\d\+\-\*\/\^]/.test(expr)) return null;

    // Prevent evaluating just a single number
    if (expr && !/^\d+(?:\.\d+)?$/.test(expr)) {
      if (/[a-z]/i.test(expr)) {
        return { task: 'simplify', expression: expr };
      }
      return { task: 'evaluate', expression: expr };
    }
  }
  return null;
}

function cleanExpr(str) {
  let s = str.replace(/\?$/, '').trim();
  return s;
}

function guessVariable(expr) {
  const vars = expr.match(/[a-zA-Z]/g);
  if (vars) {
    // Return the most frequent letter or just 'x'
    const counts = {};
    let maxChar = 'x';
    let maxCount = 0;
    vars.forEach(v => {
      counts[v] = (counts[v] || 0) + 1;
      if (counts[v] > maxCount) {
        maxCount = counts[v];
        maxChar = v;
      }
    });
    return maxChar;
  }
  return 'x';
}
