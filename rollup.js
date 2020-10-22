import node from '@rollup/plugin-node-resolve';
import cjs from '@rollup/plugin-commonjs';

export default {
    input: './src/index.js',
    output: [{
        file: 'index.cjs',
        format: 'cjs',
        exports: 'default'
    }, {
        file: 'index.js',
        format: 'es'
    }],
    plugins: [node(), cjs()]
};
