const fs = require('fs');
const jsdom = require('jsdom');
const { JSDOM } = jsdom;

const html = fs.readFileSync('c:/Users/wilmer.changotasig/Documents/Programas Wilmer/ChemConvert/index.html', 'utf-8');
const dom = new JSDOM(html);
const document = dom.window.document;
const window = dom.window;

// Load logic scripts
const periodicTable = require('c:/Users/wilmer.changotasig/Documents/Programas Wilmer/ChemConvert/periodicTable.js');
const formulaParser = require('c:/Users/wilmer.changotasig/Documents/Programas Wilmer/ChemConvert/formulaParser.js');
const parseFormula = formulaParser.parseFormula;
const calculateMolecularWeight = formulaParser.calculateMolecularWeight;

const balancer = require('c:/Users/wilmer.changotasig/Documents/Programas Wilmer/ChemConvert/balancer.js');
const stoichiometry = require('c:/Users/wilmer.changotasig/Documents/Programas Wilmer/ChemConvert/stoichiometry.js');

const parseAndBalance = balancer.parseAndBalance;
const calculateReactantToReactant = stoichiometry.calculateReactantToReactant;
const MOLAR_VOL_STP = 22.4;
const AVOGADRO_NUM = 6.022e23;

let currentBalancedData = parseAndBalance("Mg + CuCl2 -> MgCl2 + Cu");

const kIndex = 1; // CuCl2
const tIndex = 0; // Mg

const r2rAmount = "200";
const r2rUnit = "grams";
const r2rPurityVal = "86.5";
const r2rPurityType = "impurity";

const knownReactant = {
    ...currentBalancedData.reactants[kIndex],
    mw: calculateMolecularWeight(currentBalancedData.reactants[kIndex].parsed),
    amount: r2rAmount,
    unit: r2rUnit,
    purityVal: r2rPurityVal,
    purityType: r2rPurityType
};

const targetReactant = {
    ...currentBalancedData.reactants[tIndex],
    mw: calculateMolecularWeight(currentBalancedData.reactants[tIndex].parsed)
};

const results = calculateReactantToReactant(knownReactant, targetReactant);

console.log(JSON.stringify(results, null, 2));
