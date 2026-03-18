'use strict'

process.env.NODE_ENV = 'production'

const del = require('del')
const webpack = require('webpack')
const webConfig = require('./webpack.config')

web();

function web() {
    webConfig.mode = 'production'
    webpack(webConfig, (err, stats) => {
        if (err || stats.hasErrors()) console.log(err)

        console.log(stats.toString({
            chunks: false,
            colors: true
        }))
        console.log("发布成功");
        process.exit()
    })
}