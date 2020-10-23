import {sentenceTrigrams} from './n-gram.js';
import set from 'lodash.set';
import {
    buildMatchClause,
    buildSimilarityClause,
    createSchemaFields,
    normalizeFields,
    normalizeInputFactory
} from './utils.js';

const saveMiddleware = (fields) => function (next) {
    for (const [key, fn] of Object.entries(fields)) {
        this.set(key, sentenceTrigrams(fn(this)));
    }
    next();
};

const insertManyMiddleware = (fields) => function (next, docs) {
    const Ctr = this;
    docs.forEach((doc) => {
        for (const [path, fn] of Object.entries(fields)) {
            // we create an instance so the document given to the getter will have the Document API
            const instance = new Ctr(doc);
            // mutate doc in place only at trigram paths
            set(doc, path, sentenceTrigrams(fn(instance)));
        }
    });
    next();
};

export function plugin(schema, {fields = {}, select = false} = {}) {
    
    const normalizedFields = normalizeFields(fields);
    const normalizeInput = normalizeInputFactory(fields);
    const preSave = saveMiddleware(normalizedFields);
    const preInsertMany = insertManyMiddleware(normalizedFields);
    
    schema.add(createSchemaFields({fields, select}));
    schema.pre('save', preSave);
    schema.pre('insertMany', preInsertMany);
    
    schema.statics.fuzzy = function (input) {
        const normalizedInput = normalizeInput(input);
        const matchClause = buildMatchClause(normalizedInput);
        const similarity = buildSimilarityClause(normalizedInput);
        return this.aggregate([
            {$match: matchClause},
            {
                $project: {
                    _id: 0,
                    document: '$$CURRENT',
                    similarity
                }
            }
        ]);
    };
}
