/**
 * ChemConvert - Reaction Balancer
 * Algorithm based on translating a chemical reaction into a homogeneous system 
 * of linear equations and solving for the null space to find stoichiometric coefficients.
 */

/**
 * Main parse and balance function.
 * @param {string} equationStr - e.g. "H2 + O2 -> H2O" or "Na + Cl2 = NaCl"
 * @returns {Object} { reactants: [{formula, coef}], products: [{formula, coef}], isBalanced: boolean, error: string|null }
 */
function parseAndBalance(equationStr) {
    if (!equationStr || equationStr.trim() === '') return { error: "Ecuación vacía." };

    try {
        // 1. Split into reactants and products
        const sides = equationStr.split(/(?:->|=>|=|\u2192)/); // Covers ->, =, =>, and unicode arrow
        if (sides.length !== 2) throw new Error("La ecuación debe tener un lado de reactivos y un lado de productos separados por '->' o '='.");

        const reactantsRaw = sides[0].split('+').map(s => s.trim()).filter(s => s !== '');
        const productsRaw = sides[1].split('+').map(s => s.trim()).filter(s => s !== '');

        if (reactantsRaw.length === 0 || productsRaw.length === 0) throw new Error("Faltan reactivos o productos.");

        // 2. Parse formulas into matrices
        // We reuse the parseFormula function from formulaParser.js
        const reactantsParsed = reactantsRaw.map(f => parseFormula(removeCoefs(f)));
        const productsParsed = productsRaw.map(f => parseFormula(removeCoefs(f)));

        const allParsed = [...reactantsParsed, ...productsParsed];
        const numReactants = reactantsParsed.length;
        const numMolecules = allParsed.length;

        // Extract all unique elements
        const elementsSet = new Set();
        allParsed.forEach(mol => {
            Object.keys(mol).forEach(el => elementsSet.add(el));
        });
        const elements = Array.from(elementsSet);

        // Verify elements are consistent on both sides
        const reactantElements = new Set();
        reactantsParsed.forEach(mol => Object.keys(mol).forEach(el => reactantElements.add(el)));
        const productElements = new Set();
        productsParsed.forEach(mol => Object.keys(mol).forEach(el => productElements.add(el)));
        
        for (let el of elements) {
            if (!reactantElements.has(el) || !productElements.has(el)) {
                throw new Error(`El elemento '${el}' no está presente en ambos lados de la ecuación.`);
            }
        }

        // 3. Setup the matrix A where A * x = 0
        // Rows: elements, Cols: molecules (reactants positive, products negative)
        let matrix = [];
        for (let i = 0; i < elements.length; i++) {
            let row = [];
            let el = elements[i];
            for (let j = 0; j < numMolecules; j++) {
                let count = allParsed[j][el] || 0;
                // Products get negative coefficients
                if (j >= numReactants) count = -count;
                row.push(count);
            }
            matrix.push(row);
        }

        // 4. Solve the matrix (find the null space vector)
        let coefficients = nullSpaceVector(matrix, numMolecules);
        
        if (!coefficients) throw new Error("No se pudo balancear la ecuación. Verifica las fórmulas.");

        // Make sure all coefficients are positive
        if (coefficients[0] < 0) {
            coefficients = coefficients.map(c => -c);
        }

        // Return structured data
        return {
            reactants: reactantsRaw.map((formula, idx) => ({ 
                formula: removeCoefs(formula), 
                coef: coefficients[idx],
                parsed: reactantsParsed[idx]
            })),
            products: productsRaw.map((formula, idx) => ({ 
                formula: removeCoefs(formula), 
                coef: coefficients[numReactants + idx],
                parsed: productsParsed[idx]
            })),
            isBalanced: true,
            error: null
        };

    } catch (e) {
        return { error: e.message };
    }
}

// Helper to remove any numbers at the very beginning of a string (user-typed coefficients)
function removeCoefs(str) {
    return str.replace(/^[0-9\s]+/, '');
}

/**
 * Finds the null space vector with smallest integers for an MxN matrix.
 */
function nullSpaceVector(matrix, n) {
    let m = matrix.length;
    // Gaussian elimination
    let lead = 0;
    for (let r = 0; r < m; r++) {
        if (n <= lead) break;
        let i = r;
        while (matrix[i][lead] === 0) {
            i++;
            if (m === i) {
                i = r;
                lead++;
                if (n === lead) break;
            }
        }
        if (n === lead) break;
        // Swap rows i and r
        let temp = matrix[i];
        matrix[i] = matrix[r];
        matrix[r] = temp;

        let val = matrix[r][lead];
        for (let j = 0; j < n; j++) matrix[r][j] /= val;

        for (let i = 0; i < m; i++) {
            if (i === r) continue;
            val = matrix[i][lead];
            for (let j = 0; j < n; j++) {
                matrix[i][j] -= val * matrix[r][j];
            }
        }
        lead++;
    }

    // Determine the rank of the matrix
    let rank = 0;
    for (let r = 0; r < m; r++) {
        if (matrix[r].some(val => Math.abs(val) > 1e-9)) {
            rank++;
        }
    }

    // For a unique balanced stoichiometric equation, rank must be exactly n - 1
    if (rank !== n - 1) return null;

    // After RREF, find free variables. We assume ideally 1 free variable for simple stoichiometry.
    // Let's set the last column (which is usually a free variable) to 1.
    // In a well-formed chemical equation matrix of rank N-1, the last variable can be 1.
    let x = new Array(n).fill(0);
    x[n - 1] = 1;

    for (let i = n - 2; i >= 0; i--) {
        let sum = 0;
        for (let j = i + 1; j < n; j++) {
            sum += matrix[i][j] * x[j];
        }
        x[i] = -sum;
    }

    // Now x contains decimals or rationals. We need to scale to smallest integers.
    // Determine the LCM of denominators. 
    // To handle floating point inaccuracies, we use a brute-force approach up to multiplier 100
    // since chemical coefficients rarely go above 100.
    
    // Fix precision issues
    x = x.map(val => Math.round(val * 100000) / 100000);

    let bestMultiplier = 1;
    for (let m = 1; m <= 1000; m++) {
        let allInts = true;
        for (let i = 0; i < n; i++) {
            let scaled = x[i] * m;
            if (Math.abs(scaled - Math.round(scaled)) > 1e-4) {
                allInts = false;
                break;
            }
        }
        if (allInts) {
            bestMultiplier = m;
            break;
        }
    }

    let resultInts = x.map(val => Math.round(val * bestMultiplier));
    
    // Check if valid
    if (resultInts.some(v => v === 0) || resultInts.some(isNaN)) {
        return null; // Could not balance
    }

    return resultInts;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseAndBalance };
}
