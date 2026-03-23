document.addEventListener('DOMContentLoaded', () => {
    // Stage 1 DOM
    const equationInput = document.getElementById('equation-input');
    const btnBalance = document.getElementById('btn-balance');
    const balancedDisplay = document.getElementById('balanced-equation-display');
    const errorMsg = document.getElementById('equation-error');
    
    // Stage 2 DOM
    const stepReactants = document.getElementById('step-reactants');
    const reactantsContainer = document.getElementById('reactants-container');
    const btnCalculate = document.getElementById('btn-calculate');
    
    // Stage 3 DOM
    const stepResults = document.getElementById('step-results');
    const lrBanner = document.getElementById('lr-banner');
    const lrValue = document.getElementById('lr-value');
    const excessList = document.getElementById('excess-list');
    const productsList = document.getElementById('products-list');

    // Stage 3 Additions - Yield
    const reactionYieldInput = document.getElementById('reaction-yield');
    const btnRecalcYield = document.getElementById('btn-recalc-yield');
    const lrLeftoverDisplay = document.getElementById('lr-leftover-display');
    const lrLeftoverMoles = document.getElementById('lr-leftover-moles');
    const lrLeftoverMass = document.getElementById('lr-leftover-mass');

    // Reverse Mode Additions
    const modeSelector = document.getElementById('mode-selector');
    const btnModeDirect = document.getElementById('btn-mode-direct');
    const btnModeReverse = document.getElementById('btn-mode-reverse');
    const stepReverseInputs = document.getElementById('step-reverse-inputs');
    const revProductSelect = document.getElementById('rev-product-select');
    const revReactantSelect = document.getElementById('rev-reactant-select');
    const btnCalculateReverse = document.getElementById('btn-calculate-reverse');

    // Reactant to Reactant (R2R) Additions
    const btnModeR2R = document.getElementById('btn-mode-r2r');
    const stepR2RInputs = document.getElementById('step-r2r-inputs');
    const btnCalculateR2R = document.getElementById('btn-calculate-r2r');
    const r2rKnownSelect = document.getElementById('r2r-known-select');
    const r2rTargetSelect = document.getElementById('r2r-target-select');
    
    // Global State
    let currentBalancedData = null;
    let currentMode = 'direct'; // 'direct' or 'reverse'

    // Format numbers nicely
    const formatNum = (num) => {
        if (num === 0) return "0.00";
        if (num < 0.001 || num > 999999) return num.toExponential(4);
        return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 4 });
    };

    const showError = (msg, inputEl = null) => {
        if (inputEl) {
            inputEl.classList.add('error-shake');
            setTimeout(() => inputEl.classList.remove('error-shake'), 400);
        }
        if (msg) {
            errorMsg.textContent = msg;
            errorMsg.classList.remove('hidden');
        }
    };

    const hideError = () => {
        errorMsg.classList.add('hidden');
        errorMsg.textContent = '';
    };

    // --- STEP 1: PARSE AND BALANCE ---
    btnBalance.addEventListener('click', () => {
        const eqStr = equationInput.value.trim();
        hideError();
        
        const result = parseAndBalance(eqStr);
        
        if (result.error) {
            showError(result.error, equationInput);
            modeSelector.classList.add('hidden');
            stepReactants.classList.add('hidden');
            stepReverseInputs.classList.add('hidden');
            stepR2RInputs.classList.add('hidden');
            stepResults.classList.add('hidden');
            balancedDisplay.classList.add('hidden');
            return;
        }

        currentBalancedData = result;

        // Display Balanced Equation
        let eqHtml = '';
        result.reactants.forEach((r, i) => {
            eqHtml += `<span class="coef">${r.coef === 1 ? '' : r.coef}</span>${r.formula}`;
            if (i < result.reactants.length - 1) eqHtml += ' + ';
        });
        eqHtml += ' &rarr; ';
        result.products.forEach((p, i) => {
            eqHtml += `<span class="coef">${p.coef === 1 ? '' : p.coef}</span>${p.formula}`;
            if (i < result.products.length - 1) eqHtml += ' + ';
        });

        balancedDisplay.innerHTML = eqHtml;
        balancedDisplay.classList.remove('hidden');

        // Setup Reactants Panel & Selectors
        buildReactantsPanel(result.reactants);
        populateReverseSelectors(result);
        
        // Show modes
        modeSelector.classList.remove('hidden');
        stepResults.classList.add('hidden');
        updateModeUI();
    });

    // Handle Enter to balance
    equationInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') btnBalance.click();
    });

    // --- MODE TOGGLING ---
    btnModeDirect.addEventListener('click', () => {
        currentMode = 'direct';
        btnModeDirect.classList.add('active');
        btnModeReverse.classList.remove('active');
        btnModeR2R.classList.remove('active');
        updateModeUI();
    });

    btnModeReverse.addEventListener('click', () => {
        currentMode = 'reverse';
        btnModeReverse.classList.add('active');
        btnModeDirect.classList.remove('active');
        btnModeR2R.classList.remove('active');
        updateModeUI();
    });

    btnModeR2R.addEventListener('click', () => {
        currentMode = 'r2r';
        btnModeR2R.classList.add('active');
        btnModeDirect.classList.remove('active');
        btnModeReverse.classList.remove('active');
        updateModeUI();
    });

    function updateModeUI() {
        if (!currentBalancedData) return;
        stepResults.classList.add('hidden');
        
        stepReactants.classList.add('hidden');
        stepReverseInputs.classList.add('hidden');
        stepR2RInputs.classList.add('hidden');

        if (currentMode === 'direct') {
            stepReactants.classList.remove('hidden');
        } else if (currentMode === 'reverse') {
            stepReverseInputs.classList.remove('hidden');
        } else if (currentMode === 'r2r') {
            stepR2RInputs.classList.remove('hidden');
        }
    }

    function populateReverseSelectors(result) {
        revProductSelect.innerHTML = '';
        result.products.forEach((p, i) => {
            const opt = document.createElement('option');
            opt.value = i;
            opt.textContent = p.formula;
            revProductSelect.appendChild(opt);
        });

        revReactantSelect.innerHTML = '';
        r2rKnownSelect.innerHTML = '';
        r2rTargetSelect.innerHTML = '';
        
        result.reactants.forEach((r, i) => {
            // Populate Reverse Mode Reactant
            const opt1 = document.createElement('option');
            opt1.value = i;
            opt1.textContent = r.formula;
            revReactantSelect.appendChild(opt1);

            // Populate R2R Known Reactant
            const opt2 = document.createElement('option');
            opt2.value = i;
            opt2.textContent = r.formula;
            r2rKnownSelect.appendChild(opt2);

            // Populate R2R Target Reactant
            const opt3 = document.createElement('option');
            opt3.value = i;
            if (i === 1 && result.reactants.length > 1) opt3.selected = true; // Auto-select the second one if available
            opt3.textContent = r.formula;
            r2rTargetSelect.appendChild(opt3);
        });
    }

    // --- STEP 2: BUILD REACTANTS CONFIG (DIRECT MODE) ---
    function buildReactantsPanel(reactants) {
        reactantsContainer.innerHTML = '';
        
        reactants.forEach((r, i) => {
            const mw = calculateMolecularWeight(r.parsed);
            r.mw = mw; // Save MW in state
            
            const card = document.createElement('div');
            card.className = 'reactant-card';
            card.innerHTML = `
                <div class="reactant-card-header">
                    <span class="reactant-formula">${r.formula}</span>
                    <span class="reactant-mw">MW: ${mw.toFixed(2)} g/mol</span>
                </div>
                
                <div class="input-row mt-1">
                    <label>Cantidad Inicial y Unidad</label>
                    <div class="dual-input">
                        <input type="number" id="amt-${i}" value="100" step="any" min="0">
                        <select id="unit-${i}">
                            <option value="grams">Gramos (g)</option>
                            <option value="moles">Moles</option>
                            <option value="liters">Litros (CNPT)</option>
                            <option value="particles">Moléculas/Átomos</option>
                        </select>
                    </div>
                </div>

                <div class="input-row mt-1">
                    <label>Pureza del Reactivo (%)</label>
                    <input type="number" id="pur-${i}" value="100" step="1" min="1" max="100">
                </div>
            `;
            reactantsContainer.appendChild(card);
        });
    }

    // --- STEP 3: PERFORM STOICHIOMETRY ---
    btnCalculate.addEventListener('click', () => {
        if (!currentBalancedData) return;

        // Gather Inputs
        const reactInputs = currentBalancedData.reactants.map((r, i) => {
            const amtStr = document.getElementById(`amt-${i}`).value;
            const amt = parseFloat(amtStr);
            const unit = document.getElementById(`unit-${i}`).value;
            const purStr = document.getElementById(`pur-${i}`).value;
            const purity = parseFloat(purStr);
            
            return {
                ...r,
                amount: isNaN(amt) ? 0 : amt,
                unit,
                purity: isNaN(purity) ? 100 : purity
            };
        });

        // Add MW to products
        const prodInputs = currentBalancedData.products.map(p => ({
            ...p,
            mw: calculateMolecularWeight(p.parsed)
        }));

        // Optional Yield
        let yieldPct = 100;
        if (reactionYieldInput && reactionYieldInput.value) {
            yieldPct = parseFloat(reactionYieldInput.value);
            if (isNaN(yieldPct) || yieldPct <= 0) yieldPct = 100;
        }

        // Run engine
        const results = calculateStoichiometry(reactInputs, prodInputs, yieldPct);
        
        if (results.error) {
            alert(results.error);
            return;
        }

        renderResults(results);
    });

    if (btnRecalcYield) {
        btnRecalcYield.addEventListener('click', () => {
            if (currentBalancedData) btnCalculate.click();
        });
    }

    // Render results on screen
    function renderResults(res) {
        // Reset styles from reverse mode
        lrBanner.style.borderColor = 'var(--danger)';
        lrBanner.style.backgroundColor = 'rgba(239, 68, 68, 0.15)';
        lrBanner.style.boxShadow = '0 0 20px rgba(239, 68, 68, 0.2)';
        
        lrBanner.innerHTML = `
          <div class="lr-label">Reactivo Limitante:</div>
          <div id="lr-value" class="lr-value">${res.limitingReactant.formula}</div>
          
          <div class="yield-control mt-1">
            <label for="reaction-yield">Rendimiento de la Reacción (%):</label>
            <div class="dual-input" style="max-width: 200px; margin: 0.5rem auto 0;">
              <input type="number" id="reaction-yield" value="${res.yieldPct !== undefined ? res.yieldPct : 100}" min="1" max="100" step="any">
              <button id="btn-recalc-yield" class="btn-primary" style="padding: 0.5rem;">Aplicar</button>
            </div>
            <div class="lr-leftover mt-1 hidden" id="lr-leftover-display">
               Sobran: <span id="lr-leftover-moles">0</span> mol | <span id="lr-leftover-mass">0</span> g 
               <br><small>(Debido a que el rendimiento es menor al 100%)</small>
            </div>
          </div>
        `;
        
        // Re-bind yield trigger
        document.getElementById('btn-recalc-yield').addEventListener('click', () => {
             if (currentBalancedData) btnCalculate.click();
        });

        // Check if there's leftover Limiting Reactant (due to yield < 100%)
        const lrData = res.reactants.find(r => r.isLimiting);
        let yieldPct = res.yieldPct !== undefined ? res.yieldPct : 100;
        
        const lrLeftoverDisplay = document.getElementById('lr-leftover-display');
        const lrLeftoverMoles = document.getElementById('lr-leftover-moles');
        const lrLeftoverMass = document.getElementById('lr-leftover-mass');

        if (lrData && lrData.molesLeft > 0.0001) { // Floating point protection
            lrLeftoverMoles.textContent = formatNum(lrData.molesLeft);
            lrLeftoverMass.textContent = formatNum(lrData.massLeft);
            lrLeftoverDisplay.classList.remove('hidden');
        } else {
            lrLeftoverDisplay.classList.add('hidden');
        }

        // Excess Items
        excessList.innerHTML = '';
        const excessReactants = res.reactants.filter(r => !r.isLimiting);
        
        if (excessReactants.length === 0) {
            excessList.innerHTML = `<div class="item-row"><span class="item-formula" style="font-size:1rem;">Proporciones estequiométricas exactas. No hay exceso inicial.</span></div>`;
        } else {
            excessReactants.forEach(r => {
                excessList.innerHTML += `
                    <div class="item-row excess">
                        <div class="item-formula">${r.formula}</div>
                        <div class="item-detail"><span>Sobra en Moles:</span> <span>${formatNum(r.molesLeft)} mol</span></div>
                        <div class="item-detail"><span>Sobra en Masa:</span> <span>${formatNum(r.massLeft)} g</span></div>
                    </div>
                `;
            });
        }

        // Products
        productsList.innerHTML = '';
        res.products.forEach(p => {
            productsList.innerHTML += `
                <div class="item-row">
                    <div class="item-formula">${p.formula}</div>
                    <div class="item-detail"><span>Rendimiento (Moles):</span> <span>${formatNum(p.molesProduced)} mol</span></div>
                    <div class="item-detail"><span>Rendimiento (Masa):</span> <span>${formatNum(p.massProduced)} g</span></div>
                    <div class="item-detail"><span>Rendimiento (Vol CNPT):</span> <span>${formatNum(p.volumeProduced)} L</span></div>
                </div>
            `;
        });

        stepResults.classList.remove('hidden');
        // Scroll specifically to results
        setTimeout(() => {
            stepResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    // --- STEP 3: PERFORM STOICHIOMETRY (REVERSE MODE) ---
    btnCalculateReverse.addEventListener('click', () => {
        if (!currentBalancedData) return;

        const pIndex = parseInt(revProductSelect.value);
        const rIndex = parseInt(revReactantSelect.value);
        
        if (isNaN(pIndex) || isNaN(rIndex)) return;

        const amount = document.getElementById('rev-amount').value || 0;
        const unit = document.getElementById('rev-unit').value || 'moles';
        let yieldPct = parseFloat(document.getElementById('rev-yield').value);
        if (isNaN(yieldPct) || yieldPct <= 0) yieldPct = 100;

        const targetProduct = {
            ...currentBalancedData.products[pIndex],
            mw: calculateMolecularWeight(currentBalancedData.products[pIndex].parsed),
            amount,
            unit
        };

        const targetReactant = {
            ...currentBalancedData.reactants[rIndex],
            mw: calculateMolecularWeight(currentBalancedData.reactants[rIndex].parsed)
        };

        const results = calculateReverseStoichiometry(targetProduct, targetReactant, yieldPct);

        if (results.error) {
            alert(results.error);
            return;
        }

        renderReverseResults(results);
    });

    function renderReverseResults(res) {
        // Manipulate the same DOM structure to show reverse data instead
        lrBanner.style.borderColor = 'var(--warning)';
        lrBanner.style.backgroundColor = 'rgba(245, 158, 11, 0.15)';
        lrBanner.style.boxShadow = '0 0 20px rgba(245, 158, 11, 0.2)';
        
        lrBanner.innerHTML = `
            <div class="lr-label" style="color:var(--warning)">Reactivo Inicial Calculado:</div>
            <div class="lr-value">${res.targetReactant.formula}</div>
            <div class="mt-1" style="color: var(--text-main); font-size: 1.1rem;">
                Necesitas iniciar con:<br>
                <strong style="color: #fff; font-size: 1.5rem;">${formatNum(res.targetReactant.requiredMoles)} mol</strong> ó 
                <strong style="color: #fff; font-size: 1.5rem;">${formatNum(res.targetReactant.requiredMass)} g</strong>
            </div>
            <div class="mt-1" style="font-size:0.85rem; color:var(--text-muted);">
                Todos los reactivos restantes se asumen en Exceso Puro.
            </div>
        `;

        excessList.innerHTML = `
            <div class="item-row">
                <div class="item-formula">Análisis de Rendimiento</div>
                <div class="item-detail"><span>Moles Reales de <b>${res.product.formula}</b> obtenidos</span> <span>${formatNum(res.product.realMolesObtained)} mol</span></div>
                <div class="item-detail"><span>Rendimiento Físico</span> <span>${res.yieldPct}%</span></div>
                <div class="item-detail" style="border-top:1px solid rgba(255,255,255,0.2); margin-top:0.5rem; padding-top:0.5rem; color:var(--warning)"><span>Teóricamente tenías que producir:</span> <span>${formatNum(res.theoreticalMolesNeeded)} mol</span></div>
                <div style="font-size:0.75rem; color:var(--text-muted); margin-top:0.5rem">Los reactivos iniciales se calculan base en lo que teóricamente tenías que producir para contrarrestar la merma del rendimiento.</div>
            </div>
        `;

        productsList.innerHTML = `
            <div class="item-row">
               <span class="item-formula" style="font-size:1rem; color:var(--text-muted)">
               El seguimiento de los demás productos está oculto en modo inverso porque dependerá de la proporción inicial de los demás reactivos en exceso.
               </span>
            </div>
        `;

        stepResults.classList.remove('hidden');
        setTimeout(() => {
            stepResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }

    // --- STEP 3: PERFORM STOICHIOMETRY (R2R MODE) ---
    btnCalculateR2R.addEventListener('click', () => {
        if (!currentBalancedData) return;

        const kIndex = parseInt(r2rKnownSelect.value);
        const tIndex = parseInt(r2rTargetSelect.value);
        
        if (isNaN(kIndex) || isNaN(tIndex)) return;

        const amount = document.getElementById('r2r-amount').value || 0;
        const unit = document.getElementById('r2r-unit').value || 'grams';
        const purityVal = document.getElementById('r2r-purity-val').value || 100;
        const purityType = document.getElementById('r2r-purity-type').value || 'impurity';

        const knownReactant = {
            ...currentBalancedData.reactants[kIndex],
            mw: calculateMolecularWeight(currentBalancedData.reactants[kIndex].parsed),
            amount,
            unit,
            purityVal,
            purityType
        };

        const targetReactant = {
            ...currentBalancedData.reactants[tIndex],
            mw: calculateMolecularWeight(currentBalancedData.reactants[tIndex].parsed)
        };

        const results = calculateReactantToReactant(knownReactant, targetReactant);

        if (results.error) {
            alert(results.error);
            return;
        }

        renderR2RResults(results);
    });

    function renderR2RResults(res) {
        // Manipulate the same DOM structure to show r2r data instead
        lrBanner.style.borderColor = '#ec4899';
        lrBanner.style.backgroundColor = 'rgba(236, 72, 153, 0.15)';
        lrBanner.style.boxShadow = '0 0 20px rgba(236, 72, 153, 0.2)';
        
        lrBanner.innerHTML = `
            <div class="lr-label" style="color:#ec4899">Requieres Añadir Exactamente:</div>
            <div class="lr-value">${res.targetReactant.formula}</div>
            <div class="mt-1" style="color: var(--text-main); font-size: 1.1rem;">
                Para consumir tú reactivo impuro necesitas:<br>
                <strong style="color: #fff; font-size: 1.5rem;">${formatNum(res.targetReactant.requiredMass)} g</strong> ó 
                <strong style="color: #fff; font-size: 1.5rem;">${formatNum(res.targetReactant.requiredMoles)} mol</strong>
            </div>
        `;

        excessList.innerHTML = `
            <div class="item-row">
                <div class="item-formula">Análisis del Reactivo Impuro</div>
                <div class="item-detail"><span>Muestra Original:</span> <span>${res.knownReactant.amount} ${res.knownReactant.unit}</span></div>
                <div class="item-detail" style="color:#06b6d4;"><span>Pureza Activa Real:</span> <span>${res.knownReactant.effectivePurity}%</span></div>
                <div class="item-detail" style="border-top:1px solid rgba(255,255,255,0.2); margin-top:0.5rem; padding-top:0.5rem; color:var(--success)"><span>Moles Reales de ${res.knownReactant.formula}:</span> <span>${formatNum(res.knownReactant.realMoles)} mol</span></div>
            </div>
        `;

        productsList.innerHTML = `
            <div class="item-row">
               <span class="item-formula" style="font-size:1rem; color:var(--text-muted)">
               El cálculo de productos está inhabilitado en la valoración Reactivo-Reactivo para aislar el requerimiento estequiométrico primordial.
               </span>
            </div>
        `;

        stepResults.classList.remove('hidden');
        setTimeout(() => {
            stepResults.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
    }
});
