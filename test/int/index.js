import {test} from 'zora';
import mongoose from 'mongoose';
import {plugin} from '../../src/plugin.js';

const LaurentRENARD = {
    lastname_tg: ['  r', ' re', 'ren', 'ena', 'nar', 'ard', 'rd ', 'd  '],
    fullname_tg: ['  l', ' la', 'lau', 'aur', 'ure', 'ren', 'ent', 'nt ', 't  ', '  r', ' re', 'ena', 'nar', 'ard', 'rd ', 'd  '],
    firstname: 'Laurent',
    lastname: 'Renard'
};

const BobREPONGE = {
    'lastname_tg': ['  r', ' re', 'rep', 'epo', 'pon', 'ong', 'nge', 'ge ', 'e  '],
    'fullname_tg': ['  b', ' bo', 'bob', 'ob ', 'b  ', '  r', ' re', 'rep', 'epo', 'pon', 'ong', 'nge', 'ge ', 'e  '],
    'firstname': 'Bob',
    'lastname': 'Reponge'
};

const LaurenCANARD = {
        lastname_tg: ['  c', ' ca', 'can', 'ana', 'nar', 'ard', 'rd ', 'd  '],
        fullname_tg: ['  l', ' la', 'lau', 'aur', 'ure', 'ren', 'en ', 'n  ', '  c', ' ca', 'can', 'ana', 'nar', 'ard', 'rd ', 'd  '],
        firstname: 'Lauren',
        lastname: 'Canard'
    }
;

test(`integration tests`, async t => {
    try {
        const schema = new mongoose.Schema({
            firstname: String,
            lastname: String
        }, {
            versionKey: false
        });
        
        schema.plugin(plugin, {
            fields: {
                lastname_tg: 'lastname',
                fullname_tg: (doc) => [doc.get('firstname'), doc.get('lastname')].join(' ')
            }
        });
        
        const User = mongoose.model('User', schema, 'users');
        
        await mongoose.connect('mongodb://localhost:27017/fuzzy-search-test', {
            useNewUrlParser: true,
            useUnifiedTopology: true
        });
        
        await User.deleteMany();
        
        await t.test(`middleware`, async (t) => {
            
            await t.test(`should create trigrams on insert many`, async (t) => {
                const users = await User.insertMany([{
                    firstname: 'Laurent',
                    lastname: 'Renard'
                }, {
                    firstname: 'Bob',
                    lastname: 'Reponge'
                }]);
                
                const documents = users
                    .map((user) => user.toObject())
                    .map(({_id, ...rest}) => rest);
                
                t.eq(documents, [LaurentRENARD, BobREPONGE]);
            });
            
            await t.test(`should create trigram when document is created with save`, async (t) => {
                const newUser = new User({
                    firstname: 'Lauren',
                    lastname: 'Canard'
                });
                
                await newUser.save();
                
                const {_id, ...rest} = newUser.toObject();
                
                t.eq(rest, LaurenCANARD);
            });
            
            await t.test(`should update trigram when user is updated with save`, async (t) => {
                const user = await User.findOne({lastname: 'Renard'});
                
                user.lastname = 'lolo';
                
                await user.save();
                
                t.eq([...user.lastname_tg], ['  l', ' lo', 'lol', 'olo', 'lo ', 'o  ']);
                t.eq([...user.fullname_tg], ['  l', ' la', 'lau', 'aur', 'ure', 'ren', 'ent', 'nt ', 't  ', ' lo', 'lol', 'olo', 'lo ', 'o  ']);
                
                user.lastname = 'Renard';
                
                await user.save();
                
                t.eq([...user.lastname_tg], ['  r', ' re', 'ren', 'ena', 'nar', 'ard', 'rd ', 'd  ']);
                t.eq([...user.fullname_tg], ['  l', ' la', 'lau', 'aur', 'ure', 'ren', 'ent', 'nt ', 't  ', '  r', ' re', 'ena', 'nar', 'ard', 'rd ', 'd  ']);
            });
        });
        
        await t.test('search', async (t) => {
            
            const searchAndTransform = async (input) => (await User.fuzzy(input).sort({
                similarity: -1
            })).map(({similarity, document}) => {
                const {firstname, lastname} = document;
                return {
                    similarity: Math.trunc(similarity * 100),
                    firstname,
                    lastname
                };
            });
            
            await t.test(`search on every field`, async (t) => {
                const results = await searchAndTransform('renard');
                t.eq(results, [
                        {similarity: 100, firstname: 'Laurent', lastname: 'Renard'},
                        {similarity: 56, firstname: 'Lauren', lastname: 'Canard'},
                        {similarity: 25, firstname: 'Bob', lastname: 'Reponge'}
                    ]
                );
            });
            
            await t.test(`search on a particular field`, async (t) => {
                const results = await searchAndTransform({
                    lastname_tg: 'Leponge'
                });
                t.eq(results, [
                    {similarity: 66, firstname: 'Bob', lastname: 'Reponge'}
                ]);
            });
            
            await t.test(`give different weight`, async (t) => {
                const results = await searchAndTransform({
                    lastname_tg: {
                        searchQuery: 'Renard' // exact match
                    },
                    fullname_tg: {
                        searchQuery: 'repnge', // typo but with higher weight
                        weight: 20
                    }
                });
                t.eq(results, [
                    {similarity: 72, firstname: 'Bob', lastname: 'Reponge'},
                    {similarity: 28, firstname: 'Laurent', lastname: 'Renard'}
                ]);
            });
        });
        
    } finally {
        mongoose.connection.close();
    }
});
