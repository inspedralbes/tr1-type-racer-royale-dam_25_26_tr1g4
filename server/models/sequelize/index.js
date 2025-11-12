'use strict';

const fs = require('fs');
const path = require('path');
const Sequelize = require('sequelize');
const process = require('process');
const basename = path.basename(__filename);
const env = process.env.NODE_ENV || 'development';

const db = {};

let sequelize;

// For development, we can use the existing connection details from the .env or defaults
sequelize = new Sequelize(
  process.env.MYSQL_DATABASE || 'projBD',
  process.env.MYSQL_USER || 'root',
  process.env.MYSQL_ROOT_PASSWORD || '1234',
  {
    host: process.env.DB_HOST || 'db_mysql',
    dialect: 'mysql'
  }
);


fs
  .readdirSync(__dirname)
  .filter(file => {
    return (
      file.indexOf('.') !== 0 &&
      file !== basename &&
      file.slice(-3) === '.js' &&
      file.indexOf('.test.js') === -1
    );
  })
  .forEach(file => {
    const model = require(path.join(__dirname, file))(sequelize, Sequelize.DataTypes);
    db[model.name] = model;
  });

Object.keys(db).forEach(modelName => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

db.sequelize = sequelize;
db.Sequelize = Sequelize;

module.exports = db;
