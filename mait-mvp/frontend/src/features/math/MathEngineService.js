import * as math from 'mathjs';

export class MathEngineService {
  /**
   * Execute a parsed math task deterministically.
   * @param {Object} payload - { task: string, ...args }
   * @returns {{ success: boolean, resultText?: string, tex?: string, error?: string }}
   */
  static execute(payload) {
    try {
      switch (payload.task) {
        case 'evaluate':
          return this._evaluate(payload.expression);
        case 'derivative':
          return this._derivative(payload.expression, payload.variable || 'x');
        case 'simplify':
          return this._simplify(payload.expression);
        case 'midpoint':
          return this._midpoint(payload.point1, payload.point2);
        case 'distance':
          return this._distance(payload.point1, payload.point2);
        case 'gradient':
          return this._gradient(payload.point1, payload.point2);
        case 'expand':
          return this._expand(payload.expression);
        default:
          return { success: false, error: 'Unsupported math task' };
      }
    } catch (e) {
      // Silently catch and fallback to let SLM handle non-math or invalid math
      return { success: false, error: e.message || "Failed to execute math operation." };
    }
  }

  static _evaluate(expr) {
    const res = math.evaluate(expr);
    const formatted = math.format(res, { precision: 14 });
    
    // Attempt to format as LaTeX if it's a node
    let tex = formatted;
    try {
        tex = math.parse(formatted).toTex();
    } catch(e) { /* ignore tex failure */ }

    return { success: true, resultText: formatted, tex: `${math.parse(expr).toTex()} = ${tex}` };
  }

  static _derivative(expr, variable) {
    const resNode = math.derivative(expr, variable);
    const resultText = resNode.toString();
    const tex = `\\frac{d}{d${variable}} (${math.parse(expr).toTex()}) = ${resNode.toTex()}`;
    return { success: true, resultText, tex };
  }

  static _simplify(expr) {
    const resNode = math.simplify(expr);
    const tex = `${math.parse(expr).toTex()} = ${resNode.toTex()}`;
    return { success: true, resultText: resNode.toString(), tex };
  }

  static _expand(expr) {
    // math.js doesn't have a robust built-in symbolic 'expand' that works perfectly for all polynomials.
    // However, math.rationalize can expand polynomials.
    const resNode = math.rationalize(expr);
    const tex = `\\text{Expand } ${math.parse(expr).toTex()}: \\quad ${resNode.toTex()}`;
    return { success: true, resultText: resNode.toString(), tex };
  }

  static _midpoint(p1, p2) {
    const x = (p1[0] + p2[0]) / 2;
    const y = (p1[1] + p2[1]) / 2;
    // format to avoid silly decimals if integers
    const mx = math.format(x, { fraction: 'ratio' });
    const my = math.format(y, { fraction: 'ratio' });
    
    const tex = `\\text{Midpoint of } (${p1[0]}, ${p1[1]}) \\text{ and } (${p2[0]}, ${p2[1]}) = \\left(${mx}, ${my}\\right)`;
    return { success: true, resultText: `(${mx}, ${my})`, tex };
  }

  static _distance(p1, p2) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    const distSq = dx*dx + dy*dy;
    const exactDist = `\\sqrt{${distSq}}`;
    let approxDist = math.sqrt(distSq);
    approxDist = math.format(approxDist, { precision: 5 });
    
    const tex = `\\text{Distance} = \\sqrt{(${p2[0]} - ${p1[0]})^2 + (${p2[1]} - ${p1[1]})^2} = ${exactDist} \\approx ${approxDist}`;
    return { success: true, resultText: `sqrt(${distSq}) ≈ ${approxDist}`, tex };
  }

  static _gradient(p1, p2) {
    const dx = p2[0] - p1[0];
    const dy = p2[1] - p1[1];
    if (dx === 0) {
      return { success: true, resultText: 'undefined (vertical line)', tex: `m = \\frac{${p2[1]} - ${p1[1]}}{${p2[0]} - ${p1[0]}} = \\text{undefined}` };
    }
    const m = math.fraction(dy, dx);
    const tex = `m = \\frac{${p2[1]} - ${p1[1]}}{${p2[0]} - ${p1[0]}} = ${math.format(m, { fraction: 'ratio' })}`;
    return { success: true, resultText: math.format(m, { fraction: 'ratio' }), tex };
  }
}
