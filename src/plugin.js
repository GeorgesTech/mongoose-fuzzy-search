import {sentenceTrigrams} from './n-gram.js';
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
            const instance = new Ctr(doc);
            instance.set(path, sentenceTrigrams(fn(instance)));
            // mutate doc in place
            Object.assign(doc, instance.toObject());
        }
    });
    next();
};

export default (schema, {fields = {}} = {fields: {}}) => {
    
    const normalizedFields = normalizeFields(fields);
    const normalizeInput = normalizeInputFactory(fields);
    const preSave = saveMiddleware(normalizedFields);
    const preInsertMany = insertManyMiddleware(normalizedFields);
    
    schema.add(createSchemaFields(fields));
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
