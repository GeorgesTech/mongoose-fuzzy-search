import {test} from 'zora';
import {
    buildMatchClause,
    buildSimilarityClause,
    createSchemaFields,
    normalizeInputFactory,
    totalWeight
} from '../src/utils.js';

test(`utils`, (t) => {
    t.test(`create schema fields`, (t) => {
        t.eq(createSchemaFields({
            fields: {
                foo: 'bar',
                bim: (document) => document.get('woot')
            }
        }), {
            foo: {type: [String], select: false},
            bim: {type: [String], select: false}
        }, 'trigrams should not be part of the projection by default');
        
        t.eq(createSchemaFields({
            fields: {
                foo: 'bar',
                bim: (document) => document.get('woot')
            },
            select: true
        }), {
            foo: {type: [String], select: true},
            bim: {type: [String], select: true}
        }, 'trigrams should be part of the projection if option flag is true');
    });
    
    t.test(`normalizeInput`, (t) => {
        const normalize = normalizeInputFactory({
            foo: 'whatever',
            woot: 'anotherone'
        });
        t.test('it should spread input with equal weight to every field, with input string', (t) => {
            t.eq(normalize('hello'), {
                foo: {
                    searchQuery: 'hello',
                    weight: 1
                },
                woot: {
                    searchQuery: 'hello',
                    weight: 1
                }
                
            });
        });
        
        t.test(`it should add a default weight with object notation`, (t) => {
            t.eq(normalize({
                foo: {
                    searchQuery: 'some query on foo'
                },
                woot: {
                    searchQuery: 'woot query',
                    weight: 5
                },
                extra: {
                    searchQuery: 'blahblah',
                    weight: 666
                }
            }), {
                foo: {
                    searchQuery: 'some query on foo',
                    weight: 1
                },
                woot: {
                    searchQuery: 'woot query',
                    weight: 5
                }
            });
        });
    });
    
    t.test(`total weight`, (t) => {
        t.eq(totalWeight({
            foo: {
                searchQuery: 5,
                weight: 2
            },
            bar: {
                searchQuery: 5,
                weight: 5
            }
        }), 7);
    });
    
    t.test(`build match clause`, (t) => {
        t.test(`with a single field`, (t) => {
            t.eq(buildMatchClause({
                    foo: {
                        searchQuery: 'hello',
                        weight: 66
                    }
                }), {foo: {'$in': ['  h', ' he', 'hel', 'ell', 'llo', 'lo ', 'o  ']}}
            );
        });
        
        t.test(`with multiple fields`, (t) => {
            t.eq(buildMatchClause({
                    foo: {
                        searchQuery: 'hello',
                        weight: 1
                    },
                    bar: {
                        searchQuery: 'what?',
                        weight: 4
                    }
                }), {
                    foo: {'$in': ['  h', ' he', 'hel', 'ell', 'llo', 'lo ', 'o  ']},
                    bar: {'$in': ['  w', ' wh', 'wha', 'hat', 'at ', 't  ']}
                }
            );
        });
    });
    
    t.test(`buildSimilarityClause`, (t) => {
        t.test(`with a single field`, (t) => {
            t.eq(buildSimilarityClause({
                    foo: {
                        searchQuery: 'hello',
                        weight: 1
                    }
                }), {
                    $divide: [
                        {
                            $add: [{
                                $multiply: [
                                    1, {
                                        $divide: [{
                                            $size: {
                                                $setIntersection: ['$foo', ['  h', ' he', 'hel', 'ell', 'llo', 'lo ', 'o  ']]
                                            }
                                        }, 7]
                                    }]
                            }]
                        }, 1]
                }
            );
        });
    });
});
