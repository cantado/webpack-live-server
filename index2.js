
/* require.ensure(['./test'], ((require) => {
  const val = require('./test')
  setInterval(console.log, 2001, val)
})) */


const val = require('./test')
setInterval(console.log, 5334, val + '2')
