const path = require('path');

module.exports = {
  entry: './src/js/main.js',
  output: {
    path: path.resolve(__dirname, 'build', 'assets'),
    filename: 'main.js'
  },
  devtool: 'source-map'
};