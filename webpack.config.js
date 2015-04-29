module.exports = {
  entry: {
    app: [ "./app/scripts/main.js"]
  },

  output: {
    path: "./build",
    filename: "bundle.js"
  },

  module: {
    loaders: [
      // required to write "require("./style.css")"
      { test: /\.css$/,    loader: "style-loader!css-loader" },
      { test: /.scss$/,    loader: "style!css!sass"          },

      // Babel
      { test: /\.js$/, exclude: /node_modules/, loader: "babel-loader"}

    ]
  },
  externals: {
    "googlemaps": "google"
  },
};
