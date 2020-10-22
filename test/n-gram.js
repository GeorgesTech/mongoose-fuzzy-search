import {test} from 'zora';
import {nGram, sentenceTrigrams, trigram} from '../src/n-gram.js';

test(`nGram`, (t) => {
    
    t.test('with no padding', (t) => {
        const bigram = nGram(2);
        t.test('should return an array of matching bigrams sorted from left to right', (t) => {
            t.eq(bigram('laurent'), ['la', 'au', 'ur', 're', 'en', 'nt']);
        });
        t.test('should return an empty array if the length of the string is too small', (t) => {
            t.eq(bigram('l'), []);
        });
    });
    
    t.test('trigram', (t) => {
        t.test('should return trigrams of the padded input', (t) => {
            t.eq(trigram('laurent'), ['  l', ' la', 'lau', 'aur', 'ure', 'ren', 'ent', 'nt ', 't  ']);
        });
        t.test('should have trigrams of the padded input even for short strings', (t) => {
            t.eq(trigram('l'), ['  l', ' l ', 'l  ']);
        });
        t.test('should remove duplicates trigram', (t) => {
            t.eq(trigram('lolol'), ['  l', ' lo', 'lol', 'olo', 'ol ', 'l  ']);
        });
    });
    
    t.test(`draw trigrams from sentence`, (t) => {
        t.eq(sentenceTrigrams(' éléphant!  '), ['  e', ' el', 'ele', 'lep', 'eph', 'pha', 'han', 'ant', 'nt ', 't  ']);
        t.eq(sentenceTrigrams(' Comment? ça va?'), ['  c', ' co', 'com', 'omm', 'mme', 'men', 'ent', 'nt ', 't  ', ' ca', 'ca ', 'a  ', '  v', ' va', 'va ']);
        t.eq(sentenceTrigrams('Laurent Renard'), ['  l', ' la', 'lau', 'aur', 'ure', 'ren', 'ent', 'nt ', 't  ', '  r', ' re', 'ena', 'nar', 'ard', 'rd ', 'd  ']);
    });
});
