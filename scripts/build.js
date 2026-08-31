const esbuild = require('esbuild');
const { sassPlugin } = require('esbuild-sass-plugin');
const sass = require('sass');
const fs = require('fs');

const watch = process.argv.includes('--watch');

const entryPoints = [
  'src/service_worker.ts',
  'src/contentscript.ts',
  'src/links.tsx',
  'src/options.tsx',
];

function buildGlobalStyles() {
  const result = sass.compile('style/styles.scss', { sourceMap: true });
  fs.writeFileSync('style/styles.css', `${result.css}\n/*# sourceMappingURL=styles.css.map */\n`);
  fs.writeFileSync('style/styles.css.map', JSON.stringify(result.sourceMap));
}

async function main() {
  buildGlobalStyles();

  const ctx = await esbuild.context({
    entryPoints,
    bundle: true,
    outdir: 'js',
    sourcemap: true,
    splitting: true,
    format: 'esm',
    plugins: [sassPlugin()],
  });

  if (watch) {
    await ctx.watch();
    fs.watch('style/styles.scss', buildGlobalStyles);
    console.log('Watching for changes...');
  } else {
    await ctx.rebuild();
    await ctx.dispose();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
