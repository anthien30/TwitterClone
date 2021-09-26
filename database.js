const mongoose = require('mongoose');
require('dotenv').config();

class DataBase {
  constructor() {
    this.connect();
  }

  connect() {
    mongoose
      .connect(
        `mongodb+srv://admin:${process.env.DB_PASSWORD}@twitterclonecluster.lpbp1.mongodb.net/TwitterCloneDB?retryWrites=true&w=majority`
      )
      .then(() => {
        console.log('DB connection successful');
      })
      .catch((error) => {
        console.error('DB connection error', error);
      });
  }
}

module.exports = new DataBase();
