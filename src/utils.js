import deburr from 'lodash.deburr';
import {sentenceTrigrams} from './n-gram.js';

export const compose = (...fns) => (arg) => fns.reduceRight((acc, curr) => curr(acc), arg);

const replaceNonAlphaNumeric = (string) => string.replace(/\W+/g, ' ');

const split = (string) => string.split(' ');

const filter = (predicate) => (items) => items.filter(predicate);

const toLowerCase = (string) => string.toLowerCase();

const trim = (string) => string.trim();

export const normalizeFields = (options = {}) => {
    return Object.fromEntries(
        Object
            .entries(options)
            .map(([key, value]) => [
                key,
                typeof value === 'string' ?
                    (doc) => doc.get(value) :
                    value
            ])
    );
};

export const createSchemaFields = (fields = {}) => Object.fromEntries(
    Object
        .keys(fields)
        .map((key) => [key, {type: [String]}])
);

export const getWords = compose(
    filter(Boolean),
    split,
    replaceNonAlphaNumeric,
    deburr,
    toLowerCase,
    trim
);

export const normalizeInputFactory = (fields) => {
    const fieldNames = Object.keys(fields);
    return (input) => {
        if (typeof input === 'string') {
            return Object.fromEntries(
                fieldNames.map((key) => [key, {
                    searchQuery: input,
                    weight: 1
                }])
            );
        }
        
        return Object.fromEntries(
            Object
                .entries(input)
                .filter(([key, value]) => fieldNames.includes(key))
                .map(([key, value]) => {
                    const inputObject = typeof value === 'string' ? {searchQuery: value} : value;
                    if (!(inputObject && inputObject.searchQuery)) {
                        throw new Error(`you must provide at least "searchQuery" property for the query field ${key}. Ex:
                        {
                            ${key}:{
                                searchQuery: 'some query string',
                                // weight: 4, // and eventually a weight
                            }
                        }
                        `);
                    }
                    
                    return [key, {
                        searchQuery: inputObject.searchQuery,
                        weight: inputObject.weight || 1
                    }];
                })
        );
    };
};

export const totalWeight = (normalizedInput) => Object
    .values(normalizedInput)
    .reduce((acc, curr) => acc + curr.weight, 0);

const individualSimilarityClause = ([path, input]) => {
    const trigram = sentenceTrigrams(input.searchQuery);
    return {
        $multiply: [input.weight, {
            $divide: [{
                $size: {
                    $setIntersection: [`$${path}`, trigram]
                }
            },
                trigram.length]
        }]
    };
};

export const buildSimilarityClause = (normalizedInput) => {
    return {
        $divide: [{$add: Object.entries(normalizedInput).map(individualSimilarityClause)}, totalWeight(normalizedInput)]
    };
};

export const buildMatchClause = (normalizedInput) => Object.fromEntries(
    Object
        .entries(normalizedInput)
        .map(([key, value]) => [key, {$in: sentenceTrigrams(value.searchQuery)}])
);
