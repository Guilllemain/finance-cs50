const webpack = require('webpack');
const config = {
    entry: {
        app: __dirname + '/src/js/app.js',
        // charts: __dirname + '/charts.js',
    },
    output: {
        path: __dirname + '/static',
        filename: '[name].js',
    },
    resolve: {
        extensions: ['.js', '.css']
    },
};
module.exports = config;