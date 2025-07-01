// Constants
export const FULL_BPS = 10000;
export const MAX_UTILIZATION_RATE_BPS = FULL_BPS;

// Utility functions
export function convertPrice(
  amount: number,
  fromTokenPrice: number,
): number {
  if (!amount || !fromTokenPrice) return 0;
  return parseFloat(((amount * fromTokenPrice)).toFixed(8));
}
  
function normalCdf(z: number) {
  const beta1 = -0.0004406;
  const beta2 = 0.0418198;
  const beta3 = 0.9;
  const exponent = 
    -Math.sqrt(Math.PI) * (beta1 * Math.pow(z, 5) + beta2 * Math.pow(z, 3) + beta3 * z);
    
  return 1.0/(1.0 + Math.exp(exponent));
}

function normalPdf(x: number) {
  return Math.exp(-0.5 * x * x) / Math.sqrt(2 * Math.PI);
};

//s = current price
//k = strike price
//t = time to expiration in seconds
//isCall = true: call, false: put
export function black_scholes(s:number, k:number ,t:number , isCall:boolean){
  const r = 0.0;
  const sigma = 0.5;

  const d1 = (Math.log(s / k) + (r + 0.5 * sigma * sigma) * t) / (sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);

  const nd1 = normalCdf(d1);
  const nd2 = normalCdf(d2);
  const nNegd1 = normalCdf(-d1);
  const nNegd2 = normalCdf(-d2);

  if(isCall){
    return s * nd1 - k * Math.exp(-r * t) * nd2;
  }else {
    return k * Math.exp(-r * t) * nNegd2 - s * nNegd1;
  }
}

// Simplified Fraction class
export class Fraction {
  private numerator: number;
  private denominator: number;

  constructor(numerator: number, denominator: number = 1) {
    if (denominator === 0) {
      throw new Error('Division by zero');
    }
    this.numerator = numerator;
    this.denominator = denominator;
  }

  static get ONE(): Fraction {
    return new Fraction(1, 1);
  }

  static fromBps(bps: number): Fraction {
    return new Fraction(bps, FULL_BPS);
  }

  toBps(): number {
    return (this.numerator * FULL_BPS) / this.denominator;
  }

  subtract(other: Fraction): Fraction {
    const newNumerator = this.numerator * other.denominator - other.numerator * this.denominator;
    const newDenominator = this.denominator * other.denominator;
    return new Fraction(newNumerator, newDenominator);
  }

  multiply(value: number): Fraction {
    return new Fraction(this.numerator * value, this.denominator);
  }

  divide(value: number): Fraction {
    if (value === 0) throw new Error('Division by zero');
    return new Fraction(this.numerator, this.denominator * value);
  }

  add(other: Fraction): Fraction {
    const newNumerator = this.numerator * other.denominator + other.numerator * this.denominator;
    const newDenominator = this.denominator * other.denominator;
    return new Fraction(newNumerator, newDenominator);
  }

  isGreaterThan(other: Fraction): boolean {
    return this.numerator * other.denominator > other.numerator * this.denominator;
  }
}

// CurvePoint interface
export interface CurvePoint {
  utilizationRateBps: number;
  borrowRateBps: number;
}

// BorrowRateCurve class
export class BorrowRateCurve {
  public points: CurvePoint[];

  constructor(points: CurvePoint[]) {
    this.points = points;
  }

  static createDefault(): BorrowRateCurve {
    return BorrowRateCurve.newFlat(0);
  }

  validate(): void {
    const pts = this.points;

    if (pts[0].utilizationRateBps !== 0) {
      throw new Error('Invalid borrow rate curve point: first point must have 0 utilization');
    }

    if (pts[10].utilizationRateBps !== MAX_UTILIZATION_RATE_BPS) {
      throw new Error('Invalid borrow rate curve point: last point must have max utilization');
    }

    let lastPt = pts[0];
    for (let i = 1; i < pts.length; i++) {
      const pt = pts[i];
      
      if (lastPt.utilizationRateBps === MAX_UTILIZATION_RATE_BPS) {
        if (pt.utilizationRateBps !== MAX_UTILIZATION_RATE_BPS) {
          throw new Error('Invalid borrow rate curve point: utilization rate inconsistency');
        }
      } else {
        if (pt.utilizationRateBps <= lastPt.utilizationRateBps) {
          throw new Error('Invalid borrow rate curve point: utilization rates must be increasing');
        }
      }
      
      if (pt.borrowRateBps < lastPt.borrowRateBps) {
        throw new Error('Invalid borrow rate curve point: borrow rates must be non-decreasing');
      }
      
      lastPt = pt;
    }
  }

  static fromPoints(pts: CurvePoint[]): BorrowRateCurve {
    if (pts.length < 2) {
      throw new Error('Invalid borrow rate curve point: need at least 2 points');
    }
    if (pts.length > 11) {
      throw new Error('Invalid borrow rate curve point: maximum 11 points allowed');
    }
    
    const last = pts[pts.length - 1];
    if (last.utilizationRateBps !== MAX_UTILIZATION_RATE_BPS) {
      throw new Error('Invalid borrow rate curve point: last point must have max utilization');
    }

    // Fill array to 11 points, padding with the last point
    const points: CurvePoint[] = new Array(11);
    for (let i = 0; i < 11; i++) {
      if (i < pts.length) {
        points[i] = { ...pts[i] };
      } else {
        points[i] = { ...last };
      }
    }

    const curve = new BorrowRateCurve(points);
    curve.validate();
    return curve;
  }

  static newFlat(borrowRateBps: number): BorrowRateCurve {
    const points: CurvePoint[] = [
      { utilizationRateBps: 0, borrowRateBps },
      { utilizationRateBps: MAX_UTILIZATION_RATE_BPS, borrowRateBps },
    ];
    return BorrowRateCurve.fromPoints(points);
  }

  static fromLegacyParameters(
    optimalUtilizationRatePct: number,
    baseRatePct: number,
    optimalRatePct: number,
    maxRatePct: number
  ): BorrowRateCurve {
    const optimalUtilizationRate = optimalUtilizationRatePct * 100;
    const baseRate = baseRatePct * 100;
    const optimalRate = optimalRatePct * 100;
    const maxRate = maxRatePct * 100;

    let points: CurvePoint[];

    if (optimalUtilizationRate === 0) {
      points = [
        { utilizationRateBps: 0, borrowRateBps: optimalRate },
        { utilizationRateBps: MAX_UTILIZATION_RATE_BPS, borrowRateBps: maxRate },
      ];
    } else if (optimalUtilizationRate === MAX_UTILIZATION_RATE_BPS) {
      points = [
        { utilizationRateBps: 0, borrowRateBps: baseRate },
        { utilizationRateBps: MAX_UTILIZATION_RATE_BPS, borrowRateBps: optimalRate },
      ];
    } else {
      points = [
        { utilizationRateBps: 0, borrowRateBps: baseRate },
        { utilizationRateBps: optimalUtilizationRate, borrowRateBps: optimalRate },
        { utilizationRateBps: MAX_UTILIZATION_RATE_BPS, borrowRateBps: maxRate },
      ];
    }

    return BorrowRateCurve.fromPoints(points);
  }

  getBorrowRate(utilizationRate: Fraction): Fraction {
    const adjustedUtilizationRate = utilizationRate.isGreaterThan(Fraction.ONE) 
      ? Fraction.ONE 
      : utilizationRate;

    const utilizationRateBps = adjustedUtilizationRate.toBps();

    // Find the appropriate window in the curve
    for (let i = 0; i < this.points.length - 1; i++) {
      const startPt = this.points[i];
      const endPt = this.points[i + 1];

      if (utilizationRateBps >= startPt.utilizationRateBps && 
          utilizationRateBps <= endPt.utilizationRateBps) {
        
        if (utilizationRateBps === startPt.utilizationRateBps) {
          return Fraction.fromBps(startPt.borrowRateBps);
        }
        if (utilizationRateBps === endPt.utilizationRateBps) {
          return Fraction.fromBps(endPt.borrowRateBps);
        }

        return this.interpolate(startPt, endPt, adjustedUtilizationRate);
      }
    }

    throw new Error('Invalid utilization rate');
  }

  private interpolate(startPt: CurvePoint, endPt: CurvePoint, utilizationRate: Fraction): Fraction {
    const slopeNom = endPt.borrowRateBps - startPt.borrowRateBps;
    if (slopeNom < 0) {
      throw new Error('Invalid borrow rate curve point');
    }

    const slopeDenom = endPt.utilizationRateBps - startPt.utilizationRateBps;
    if (slopeDenom <= 0) {
      throw new Error('Invalid borrow rate curve point');
    }

    const startUtilizationRate = Fraction.fromBps(startPt.utilizationRateBps);
    const coef = utilizationRate.subtract(startUtilizationRate);

    const nom = coef.multiply(slopeNom);
    const baseRate = nom.divide(slopeDenom);

    const offset = Fraction.fromBps(startPt.borrowRateBps);
    const result = baseRate.add(offset);

    return result;
  }
}

// Utility functions that match your Rust OptionDetail implementation
export class OptionDetailUtils {
  /**
   * Calculate utilization percentage: (tokenLocked / tokenOwned) * 100
   */
  static calculateUtilization(tokenLocked: number, tokenOwned: number): number {
    if (tokenOwned === 0) {
      return 0;
    }
    return Math.round((tokenLocked / tokenOwned) * 100);
  }

  /**
   * Calculate borrow rate using 11-point curve
   */
  static calculateBorrowRate(tokenLocked: number, tokenOwned: number, isSol: boolean): number {
    // Get the appropriate 11-point curve
    const curve = isSol
      ? BorrowRateCurve.fromLegacyParameters(80, 3, 12, 60) // SOL: 3% base, 12% optimal at 80%, 60% max
      : BorrowRateCurve.fromLegacyParameters(80, 1, 5, 25);  // USDC: 1% base, 5% optimal at 80%, 25% max

    // Calculate utilization
    const utilizationPct = OptionDetailUtils.calculateUtilization(tokenLocked, tokenOwned);
    const utilizationBps = Math.min(utilizationPct * 100, 10000);
    const utilizationFraction = Fraction.fromBps(utilizationBps);

    // Get borrow rate from curve
    const borrowRateFraction = curve.getBorrowRate(utilizationFraction);
    const borrowRateBps = borrowRateFraction.toBps();

    // Convert to percentage
    return parseFloat((borrowRateBps / 100).toFixed(2));
  }

  /**
   * Get SOL borrow rate
   */
  static getSolBorrowRate(solLocked: number, solOwned: number): number {
    return OptionDetailUtils.calculateBorrowRate(solLocked, solOwned, true);
  }

  /**
   * Get USDC borrow rate
   */
  static getUsdcBorrowRate(usdcLocked: number, usdcOwned: number): number {
    return OptionDetailUtils.calculateBorrowRate(usdcLocked, usdcOwned, false);
  }

  /**
   * Enhanced Black-Scholes with dynamic risk-free rate from borrow curves
   */
  static blackScholesWithBorrowRate(
    s: number,           // Current price
    k: number,           // Strike price  
    t: number,           // Time to expiration
    call: boolean,       // Option type
    tokenLocked: number, // Current locked tokens
    tokenOwned: number,  // Total owned tokens
    isSol: boolean       // Asset type
  ): number {
    console.log("borrow");
    // Calculate dynamic risk-free rate from borrow curve
    const r = OptionDetailUtils.calculateBorrowRate(tokenLocked, tokenOwned, isSol) / 100;
    const sigma = 0.5; // Keep volatility simple for now

    const d1 = (Math.log(s / k) + (r + 0.5 * sigma * sigma) * t) / (sigma * Math.sqrt(t));
    const d2 = d1 - sigma * Math.sqrt(t);

    const nD1 = normalCdf(d1);
    const nD2 = normalCdf(d2);
    const nNegD1 = normalCdf(-d1);
    const nNegD2 = normalCdf(-d2);

    const price = call
      ? s * nD1 - k * Math.exp(-r * t) * nD2
      : k * Math.exp(-r * t) * nNegD2 - s * nNegD1;

    return price;
  }
}
export function delta_calc(s: number, k: number, t:number, isCall:boolean){
  const r = 0.0;
  const sigma = 0.5

  const d1 = (Math.log(s / k) + (r + Math.pow(sigma, 2) / 2) * t) / (sigma * Math.sqrt(t));
  
  
  return isCall ? normalCdf(d1) : -normalCdf(-d1);
}

export function gamma_calc(s: number, k: number, t:number){
  const r = 0.0;
  const sigma = 0.5;

  const d1 = (Math.log(s / k) + (r + Math.pow(sigma, 2) / 2) * t) / (sigma * Math.sqrt(t));

  return normalPdf(d1) / (s * sigma * Math.sqrt(t))
}

export function vega_calc(s: number, k: number, t:number){
  const r = 0.0;
  const sigma = 0.5;

  const d1 = (Math.log(s / k) + (r + Math.pow(sigma, 2) / 2) * t) / (sigma * Math.sqrt(t));

  let vegaValue : number;
  
  vegaValue = s * normalPdf(d1) * Math.sqrt(t);

  return vegaValue * 0.01
}

export function theta_calc(s: number, k: number, t:number, isCall:boolean){
  const r = 0.0;
  const sigma = 0.5;

  const d1 = (Math.log(s / k) + (r + Math.pow(sigma, 2) / 2) * t) / (sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);

  let thetaValue: number;

  if(isCall){
    thetaValue = (-s * normalPdf(d1) * sigma) / (2 * Math.sqrt(t)) - r * k * Math.exp(-r * t) * normalCdf(d2);
  } else {
    thetaValue = (-s * normalPdf(d1) * sigma) / (2 * Math.sqrt(t)) - r * k * Math.exp(-r * t) * normalCdf(-d2);
  }

  return thetaValue/365;
}

export function rho_calc(s: number, k: number, t:number, isCall:boolean){
  const r = 0.0;
  const sigma = 0.5;

  const d1 = (Math.log(s / k) + (r + Math.pow(sigma, 2) / 2) * t) / (sigma * Math.sqrt(t));
  const d2 = d1 - sigma * Math.sqrt(t);

  let rhoValue: number;

  if(isCall){
    rhoValue = k * t * Math.exp(-r * t) * normalCdf(d2)
  }else{
    rhoValue = -k * t * Math.exp(-r * t) * normalCdf(-d2)
  }

  return rhoValue * 0.01;
}

