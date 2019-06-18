const webpack = require('webpack');
const config = {
    entry: {
        app: __dirname + '/src/js/app.js',
        chart: __dirname + '/src/js/chart.js',
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