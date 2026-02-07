const esbuild = require('esbuild');

esbuild.build({
    entryPoints: ['node_modules/@cashapp/sqldelight-sqljs-worker/sqljs.worker.js'],
    bundle: true,
    outfile: 'public/worker.js',
    platform: 'browser',
    format: 'iife',
    define: {
        'process.env.NODE_ENV': '"production"',
        'global': 'self'
    },
    plugins: [{
        name: 'node-deps-shim',
        setup(build) {
            build.onResolve({ filter: /^(fs|path|crypto)$/ }, args => {
                return { path: args.path, namespace: 'shim-disabled' }
            })
            build.onLoad({ filter: /.*/, namespace: 'shim-disabled' }, args => {
                return { contents: 'export default {}' }
            })
        },
    }],
}).catch(() => process.exit(1));
