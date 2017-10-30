#!/usr/bin/env node

const {spawn} = require('child_process')
const path = require('path')
const webpack = require('webpack')
const minimist = require('minimist')
const chalk = require('chalk')
const MemoryFS = require('memory-fs')

let childProcess = null
const memFs = new MemoryFS()

const logInfo = (info) => {
  process.stdout.write(chalk.green(`${info}\n`))
}

const logWarning = (warning) => {
  process.stdout.write(chalk.yellow(`${warning}\n`))
}

const logError = (error) => {
  process.stdout.write(chalk.red(`${error}\n`))
}

const clearConsole = () => {
  process.stdout.write('\u001Bc')
  logInfo('⌃C to exit.')
}

const getAssetInfoString = (asset) => `\t${asset.name}\t${asset.size}`

const printBuildInfo = (info) => {
  const buildAssets = info.assets.filter((asset) => asset.emitted)
  process.stdout.write(`
Build Time: ${info.time}
Build Hash: ${info.hash}
Build Assets:\n${buildAssets.map(getAssetInfoString).join('\n')}
`)
}

const getWebpackOptions = (configPath) => {
  const config = require(path.resolve(process.cwd(), configPath))
  return config instanceof Function ? config() : config
}

const getExecuteObject = (arr) => {
  if (!arr || !arr.length) {
    return
  }
  return {
    command: arr[0],
    args: arr.slice(1)
  }
}

const firstItem = (obj) => obj[Object.keys(obj)[0]]

const getDefaultExecuteCommand = (webpackConfig, buildInfo) => {
  const {
    output: {path: outputPath},
    context = ''
  } = webpackConfig
  const {entrypoints} = buildInfo
  const basename = firstItem(entrypoints).assets[0]
  const file = path.resolve(context, outputPath, basename)
  const fileContent = memFs.readFileSync(file).toString()
  return {
    command: 'node',
    args: ['-e', fileContent]
  }
}

const killProcess = () => {
  if (childProcess && !childProcess.killed) {
    childProcess.kill()
  }
}

const spawnProcess = (options) => {
  killProcess()

  logInfo('starting process ...')

  childProcess = spawn(options.command, options.args)
  childProcess.stdout.on('data', (data) => process.stdout.write(data))
  childProcess.stderr.on('data', logError)
  childProcess.on('close', (code) => {
    if (code) {
      logError(`process exited with code ${code}`)
    }
  })
}

const run = (options = {}) => {
  clearConsole()

  logInfo('Loading webpack options ...')
  let webpackConfig = null
  try {
    webpackConfig = getWebpackOptions(options.config)
  } catch (error) {
    logError(error)
    process.exitCode = 1
    return
  }

  const compiler = webpack(webpackConfig)
  compiler.outputFileSystem = memFs

  const watching = compiler.watch({}, (err, stats) => {
    killProcess()

    if (err) {
      logError(err.stack || err)
      if (err.details) {
        logError(err.details)
      }
      return
    }

    const info = stats.toJson()

    if (stats.hasErrors()) {
      logError(info.errors)
      return
    }

    if (stats.hasWarnings()) {
      logWarning(info.warnings)
    }

    printBuildInfo(info)

    const executeCommand = options.executeCommand || getDefaultExecuteCommand(webpackConfig, info)
    spawnProcess(executeCommand)
  })
}

const argv = minimist(process.argv.slice(2), {'--': true})

const params = {
  config: argv.config || './webpack.config.js',
  executeCommand: getExecuteObject(argv['--'])
}

run(params)
