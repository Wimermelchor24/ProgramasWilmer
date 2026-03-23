/**
 * ChemConvert - Stoichiometry Engine
 * Calculates theoretical yields, limiting reactants, and excess amounts.
 */

const AVOGADRO_NUM = 6.022e23;
const MOLAR_VOL_STP = 22.4;

/**
 * Executes a full stoichiometry simulation based on inputs.
 * @param {Array} reactants - List of reactants { formula, coef, mw, amount, unit, purity }
 * @param {Array} products - List of products { formula, coef, mw }
 * @param {number} yieldPct - Reaction yield percentage (default 100).
 * @returns {Object} result data with calculated moles, limit reactant, etc.
 */
function calculateStoichiometry(reactants, products, yieldPct = 100) {
    if (!reactants || reactants.length === 0 || !products || products.length === 0) {
         return { error: "Faltan reactivos o productos." };
    }

    // 1. Convert all reactant inputs to REAL MOLES
    const processedReactants = reactants.map((r, index) => {
        let theoreticalMoles = 0;
        switch(r.unit) {
            case 'moles': theoreticalMoles = r.amount; break;
            case 'grams': theoreticalMoles = r.amount / r.mw; break;
            case 'liters': theoreticalMoles = r.amount / MOLAR_VOL_STP; break;
            case 'particles': theoreticalMoles = r.amount / AVOGADRO_NUM; break;
            default: theoreticalMoles = r.amount;
        }

        // Apply purity
        const realMoles = theoreticalMoles * (r.purity / 100);
        
        // Calculate the ratio of real moles to stoichiometric coefficient
        // to find limiting reactant
        const limitingRatio = realMoles / r.coef;

        return {
            ...r,
            index,
            theoreticalMoles,
            realMoles,
            limitingRatio
        };
    });

    // 2. Determine Limiting Reactant
    // Find the reactant with the minimum limiting ratio
    let limitingReactant = processedReactants[0];
    for (let i = 1; i < processedReactants.length; i++) {
        if (processedReactants[i].limitingRatio < limitingReactant.limitingRatio) {
            limitingReactant = processedReactants[i];
        }
    }

    // Base moles for the entire reaction based on LR
    const reactionBaseMoles = limitingReactant.limitingRatio;

    // Determine how many base moles are ACTUALLY converted into products based on yield
    const actualConversionRatio = yieldPct / 100;

    // 3. Calculate Exceses and Leftovers
    const finalReactants = processedReactants.map(r => {
        // Stoichiometrically required to react
        const theoreticalMolesRequired = reactionBaseMoles * r.coef;
        // Moles that ACTUALLY reacted based on the yield
        const molesUsed = theoreticalMolesRequired * actualConversionRatio;
        
        // Everything else is left over
        const molesLeft = r.realMoles - molesUsed;
        const isLimiting = r.index === limitingReactant.index;
        
        return {
            ...r,
            theoreticalMolesRequired,
            molesUsed,
            molesLeft,
            isLimiting,
            massLeft: molesLeft * r.mw
        };
    });

    // 4. Calculate Products theoretical and actual yield
    const finalProducts = products.map((p, index) => {
        // Moles produced based on actual yield converted amount
        const molesProduced = reactionBaseMoles * p.coef * actualConversionRatio;
        
        return {
            ...p,
            index,
            molesProduced,
            massProduced: molesProduced * p.mw,
            volumeProduced: molesProduced * MOLAR_VOL_STP,
            particlesProduced: molesProduced * AVOGADRO_NUM
        };
    });

    return {
        reactants: finalReactants,
        products: finalProducts,
        limitingReactant: {
            formula: limitingReactant.formula,
            index: limitingReactant.index
        },
        error: null
    };
}

/**
 * Executes a reverse stoichiometry simulation (Product -> Reactant)
 * @param {Object} targetProduct - The product we generated { formula, coef, mw, amount, unit }
 * @param {Object} targetReactant - The reactant we want to find out { formula, coef, mw }
 * @param {number} yieldPct - Reaction yield percentage (default 100).
 * @returns {Object} result data with calculated initial mass and moles needed.
 */
function calculateReverseStoichiometry(targetProduct, targetReactant, yieldPct = 100) {
    if (!targetProduct || !targetReactant) return { error: "Faltan datos de producto o reactivo objetivo." };

    // 1. Calculate REAL moles of product obtained
    let realMolesObtained = 0;
    const amount = Number(targetProduct.amount);
    
    switch (targetProduct.unit) {
        case 'moles':
            realMolesObtained = amount;
            break;
        case 'grams':
            realMolesObtained = amount / targetProduct.mw;
            break;
        case 'liters':
            realMolesObtained = amount / MOLAR_VOL_STP;
            break;
        case 'particles':
            realMolesObtained = amount / AVOGADRO_NUM;
            break;
        default:
            realMolesObtained = amount;
    }

    // 2. Adjust by yield to find out how many THEORETICAL moles we needed to produce
    // If yield is 50%, we needed to theoretically produce double to get the real amount.
    const theoreticalYieldMultiplier = 100 / yieldPct;
    const theoreticalMolesNeeded = realMolesObtained * theoreticalYieldMultiplier;

    // 3. Stoichiometric Ratio (Reactant / Product)
    // How many moles of reactant do I need for each mol of product?
    const ratio = targetReactant.coef / targetProduct.coef;

    // 4. Calculate required reactant moles
    const requiredReactantMoles = theoreticalMolesNeeded * ratio;
    const requiredReactantMass = requiredReactantMoles * targetReactant.mw;

    return {
        product: {
            ...targetProduct,
            realMolesObtained
        },
        targetReactant: {
            ...targetReactant,
            requiredMoles: requiredReactantMoles,
            requiredMass: requiredReactantMass
        },
        theoreticalMolesNeeded,
        yieldPct
    };
}

/**
 * Calculates how much of a target reactant is needed to fully consume a known reactant,
 * factoring in impurity or purity percentages.
 * @param {Object} knownReactant { formula, coef, mw, amount, unit, purityVal, purityType }
 * @param {Object} targetReactant { formula, coef, mw }
 */
function calculateReactantToReactant(knownReactant, targetReactant) {
    if (!knownReactant || !targetReactant) return { error: "Faltan datos de reactivos" };

    let effectivePurity = Number(knownReactant.purityVal);
    if (isNaN(effectivePurity)) effectivePurity = 100;
    
    // Convert Impurity to Purity
    if (knownReactant.purityType === 'impurity') {
        effectivePurity = 100 - effectivePurity;
        if (effectivePurity < 0) effectivePurity = 0;
    }

    // 1. Calculate REAL MOLES of known reactant
    let theoreticalMoles = 0;
    const amount = Number(knownReactant.amount);
    
    switch (knownReactant.unit) {
        case 'moles': theoreticalMoles = amount; break;
        case 'grams': theoreticalMoles = amount / knownReactant.mw; break;
        case 'liters': theoreticalMoles = amount / MOLAR_VOL_STP; break;
        case 'particles': theoreticalMoles = amount / AVOGADRO_NUM; break;
        default: theoreticalMoles = amount;
    }

    // Apply purity
    const realMolesKnown = theoreticalMoles * (effectivePurity / 100);

    // 2. Stoichiometric Ratio
    // How many moles of target do I need for each mol of known?
    const ratio = targetReactant.coef / knownReactant.coef;

    // 3. Calculate Target Reactant needs
    const requiredMoles = realMolesKnown * ratio;
    const requiredMass = requiredMoles * targetReactant.mw;

    return {
        knownReactant: {
            ...knownReactant,
            realMoles: realMolesKnown,
            effectivePurity
        },
        targetReactant: {
            ...targetReactant,
            requiredMoles,
            requiredMass,
            requiredLiters: requiredMoles * MOLAR_VOL_STP
        }
    };
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = { calculateStoichiometry, calculateReverseStoichiometry, calculateReactantToReactant };
}
