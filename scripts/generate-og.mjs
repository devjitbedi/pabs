/**
 * Converts public/og.svg → public/og.png (1200×630)
 * and public/apple-touch-icon-source.svg → public/apple-touch-icon.png (180×180)
 *
 * Run: node scripts/generate-og.mjs
 * Re-run whenever og.svg or apple-touch-icon-source.svg changes.
 */
import { Resvg } from '@resvg/resvg-js'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(__dirname, '..')

const FONT_DIRS = [
  '/System/Library/Fonts/Supplemental',
  '/System/Library/Fonts',
  '/Library/Fonts',
]

function svgToPng(inputPath, outputPath, width, height) {
  const svg = fs.readFileSync(inputPath, 'utf8')
  const resvg = new Resvg(svg, {
    fitTo: { mode: 'width', value: width },
    font: {
      fontDirs: FONT_DIRS,
      loadSystemFonts: true,
      defaultFontFamily: 'Georgia',
    },
  })
  const png = resvg.render().asPng()
  fs.writeFileSync(outputPath, png)
  console.log(`✓ ${path.relative(root, outputPath)} (${png.length.toLocaleString()} bytes)`)
}

svgToPng(
  path.join(root, 'public/og.svg'),
  path.join(root, 'public/og.png'),
  1200, 630,
)

svgToPng(
  path.join(root, 'public/apple-touch-icon-source.svg'),
  path.join(root, 'public/apple-touch-icon.png'),
  180, 180,
)
