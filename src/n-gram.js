import {compose, getWords} from './utils.js';

const leftPad = (length, {symbol = ' '} = {}) => (string) => string.padStart(length + string.length, symbol);
const rightPad = (length, {symbol = ' '} = {}) => (string) => string.padEnd(length + string.length, symbol);
const addPadding = (length, opts = {}) => compose(leftPad(length, opts), rightPad(length, opts));
export const removeDuplicate = (array) => [...new Set(array)];

export const nGram = (n, {withPadding = false} = {withPadding: false}) => {
    
    const wholeNGrams = (string, accumulator = []) => {
        if (string.length < n) {
            return accumulator;
        }
        accumulator.push(string.slice(0, n));
        return wholeNGrams(string.slice(1), accumulator);
    };
    
    const pad = addPadding(n - 1);
    
    return withPadding ? compose(removeDuplicate, wholeNGrams, pad) : compose(removeDuplicate, wholeNGrams);
};

export const trigram = nGram(3, {withPadding: true});

const combineTriGrams = (string) => getWords(string)
    .map(trigram)
    .reduce((acc, curr) => acc.concat(curr), []);

export const sentenceTrigrams = compose(removeDuplicate, combineTriGrams);

