/**
 * Parses a chemical formula into an object mapping elements to atom counts.
 * Handles single elements (e.g., C, O2), grouped elements (e.g., OH, SO4),
 * and parenthesized groups with multipliers (e.g., (NH4)2, Al2(SO4)3).
 *
 * @param {string} formulaStr - The chemical formula string to parse.
 * @returns {Object} An object mapping element symbols to their total atom count.
 * @throws {Error} If the formula relates to an unknown element or has syntax errors.
 */
function parseFormula(formulaStr) {
    if (!formulaStr || formulaStr.trim() === '') {
        return {};
    }

    // Advanced tokenization logic handling nested parentheses
    const tokens = formulaStr.match(/([A-Z][a-z]?)|(\d+)|(\()|(\))/g);
    if (!tokens) {
        throw new Error("Invalid formula format.");
    }

    const counts = {};
    let currentScale = 1;
    let index = tokens.length - 1;

    // Stack to keep track of multiplier for nested parentheses
    const multiplierStack = [1];
    let justAfterCloseParen = false;

    while (index >= 0) {
        const token = tokens[index];

        if (!isNaN(parseInt(token, 10))) {
            currentScale = parseInt(token, 10);
            justAfterCloseParen = false;
        } else if (token === ')') {
            multiplierStack.push(currentScale * multiplierStack[multiplierStack.length - 1]);
            currentScale = 1;
            justAfterCloseParen = true;
        } else if (token === '(') {
            multiplierStack.pop();
            currentScale = 1;
            justAfterCloseParen = false;
        } else {
            // It's an element symbol
            const element = token;
            if (!periodicTable[element]) {
                throw new Error(`Unknown element: ${element}`);
            }
            
            // If the element wasn't immediately followed by a number, its count is 1 for this instance
            let atomCount = (justAfterCloseParen ? 1 : currentScale) * multiplierStack[multiplierStack.length - 1];
            counts[element] = (counts[element] || 0) + atomCount;
            
            // Reset scale and flag after processing the element
            currentScale = 1;
            justAfterCloseParen = false;
        }
        index--;
    }

    if (multiplierStack.length > 1) {
        throw new Error("Mismatched parentheses in formula.");
    }

    return counts;
}

/**
 * Calculates the molecular weight of a parsed formula object.
 *
 * @param {Object} parsedObj - Object mapping element symbols to counts.
 * @returns {number} The total molecular weight.
 */
function calculateMolecularWeight(parsedObj) {
    let mw = 0;
    for (const [element, count] of Object.entries(parsedObj)) {
        if (periodicTable[element]) {
            mw += periodicTable[element].mass * count;
        }
    }
    return mw;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { parseFormula, calculateMolecularWeight };
}
