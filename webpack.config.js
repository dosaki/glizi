const path = require('path');

module.exports = {
  entry: './src/js/main.js',
  output: {
    path: path.resolve(__dirname, 'build', 'js'),
    filename: 'main.js'
  },
  devtool: 'source-map',
  resolve: {
    fallback: {
      "crypto": false
    }
  }
};