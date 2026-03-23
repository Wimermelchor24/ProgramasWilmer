/**
 * ChemConvert - Converter Logic
 * Handles calculations between different chemical units.
 * Constants:
 *  - N_A (Avogadro's Number) = 6.02214076 * 10^23
 *  - CNPT Molar Volume = 22.4 L/mol
 */

const AVOGADRO = 6.022e23;
const MOLAR_VOLUME_STP = 22.4; // Liters at STP

/**
 * Converts a given amount from one unit to another, considering molecular weight and element atom counts.
 *
 * @param {number} amount - The amount to convert.
 * @param {string} fromUnit - Origin unit ("moles", "grams", "liters", "particles", "at-g").
 * @param {string} toUnit - Target unit ("moles", "grams", "liters", "particles", "at-g").
 * @param {number} mwCompound - Molecular weight of the whole compound (g/mol).
 * @param {number|null} targetAtomCount - Count of the target element in one molecule (null if calculating for the whole compound).
 * @param {number|null} mwTargetElement - Atomic weight of the target element (null if calculating for the whole compound).
 * @returns {number} The converted value.
 */
function convertUnits(amount, fromUnit, toUnit, mwCompound, targetAtomCount = null, mwTargetElement = null) {
    if (isNaN(amount) || amount === 0) return 0;

    // 1. Convert input amount to MOLES of the target substance (either the compound or the specific element)
    let moles = 0;

    // Case A: Given amount is about the WHOLE COMPOUND (default)
    if (targetAtomCount === null) {
        moles = convertToMoles(amount, fromUnit, mwCompound); // Compound moles
    } 
    // Case B: Given amount is about a SPECIFIC ELEMENT in the compound
    else {
        // If the user inputs an amount of the specific element directly (e.g., 10g of Oxygen in H2O)
        // First convert the element's amount into moles of the element
        const elementMoles = convertToMoles(amount, fromUnit, mwTargetElement, true);
        
        // The core logic for this simplified calculator: 
        // We assume the user is asking "If I have X amount of the compound, how much of this element is there?"
        // Or "If I have X amount of this element, how much compound does it make?"
        
        // Actually, the simpler UI implies: 
        // Input Amount -> relates to the target selected.
        // If Target is "Compound": we calculate for the compound.
        // If Target is "Oxygen": we calculate just for the oxygen part based on the input amount of Oxygen.
        
        // Let's refine based on typical chem calculator flow:
        // Input: 1 mole of H2O -> Target: O
        // The UI flow given was "Amount to Convert" of "Unit A" -> "Unit B"
        // And "Calculate for: Compound / Element".
        // This implies the input amount is ALWAYS of the formula (Compound).
        // Then we find how much of the "Target" (Compound or Element) it represents.
        
        // REVISION: The input `amount` is ALWAYS the compound.
        const compoundMoles = convertToMoles(amount, fromUnit, mwCompound);
        
        // Find moles of the target element
        moles = compoundMoles * targetAtomCount;
    }

    // 2. Convert MOLES of the target substance to the final requested unit
    let result = 0;
    const effectiveMW = targetAtomCount === null ? mwCompound : mwTargetElement;
    const isElement = targetAtomCount !== null;

    switch (toUnit) {
        case 'moles':
            result = moles;
            break;
        case 'grams':
            result = moles * effectiveMW;
            break;
        case 'liters':
            // Customarily, liquids/solids aren't calculated this way, but standard chem calculators allow it 
            // assuming it's a gas at STP for educational purposes.
            result = moles * MOLAR_VOLUME_STP;
            break;
        case 'particles':
            result = moles * AVOGADRO;
            break;
        case 'at-g':
            if (isElement) {
                result = moles; // 1 at-g = 1 mole of atoms
            } else {
                // If asking for at-g of a compound, it's technically invalid, but we'll return total moles of atoms
                // Usually not applicable for compounds, but we'll adapt.
                throw new Error("Átomo-gramo solo aplica a elementos individuales, no a compuestos enteros.");
            }
            break;
    }

    return result;
}

/**
 * Helper to convert any unit to moles.
 */
function convertToMoles(val, unit, molarMass, isElement = false) {
    if (!molarMass || molarMass <= 0) return 0;
    
    switch (unit) {
        case 'moles':
            return val;
        case 'grams':
            return val / molarMass;
        case 'liters':
            return val / MOLAR_VOLUME_STP;
        case 'particles':
            return val / AVOGADRO;
        case 'at-g':
            if (isElement) return val;
            throw new Error("Átomo-gramo solo aplica a elementos, seleccione un elemento destino.");
        default:
            return val;
    }
}

// Special case UI wrapper:
// If the user inputs 100g of H2O and wants to know Particles of O
// Input: 100, grams, H2O (MW: 18)
// Target: O (Count: 1, MW: 16)
// To Unit: Particles
// compoundMoles = 100 / 18 = 5.55 mol H2O
// targetMoles = 5.55 * 1 = 5.55 mol O
// particles = 5.55 * 6.022e23 = 3.34e24 atoms of O
function calculateResult(inputValue, fromUnit, toUnit, compoundFormula, targetElement, parsedFormulaDictionary) {
    try {
        const mwCompound = calculateMolecularWeight(parsedFormulaDictionary);
        
        if (mwCompound === 0) return { error: "Fórmula inválida o vacía." };

        let targetAtomCount = null;
        let mwTargetElement = null;

        if (targetElement !== "compound") {
            if (!parsedFormulaDictionary[targetElement]) {
                 return { error: `El elemento ${targetElement} no está en la fórmula.` };
            }
            targetAtomCount = parsedFormulaDictionary[targetElement];
            mwTargetElement = periodicTable[targetElement].mass;
        }

        const resultValue = convertUnits(
            parseFloat(inputValue),
            fromUnit,
            toUnit,
            mwCompound,
            targetAtomCount,
            mwTargetElement
        );

        return { value: resultValue, error: null };
    } catch (e) {
        return { error: e.message };
    }
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateResult, convertUnits };
}
