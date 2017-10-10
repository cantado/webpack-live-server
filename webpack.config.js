const path = require('path')
const fs = require('fs')

const nodeModules = fs.readdirSync(path.resolve(process.cwd(), 'node_modules'))
  .filter((x) => ['.bin'].indexOf(x) === -1)
  .reduce((modules, mod) => Object.assign(modules, {[mod]: `commonjs ${mod}`}))

const config = (options, args = {}) => {
  return {
    entry: path.resolve(process.cwd(), 'index.js'),

    target: 'node',

    output: {
      path: path.resolve(process.cwd(), 'dist'),
      filename: '[name].js'
    },

    externals: nodeModules
  }
}

module.exports = config

