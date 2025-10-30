const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');
const Sessio = sequelize.define('Sessio', {
  id: {
    type: DataTypes.INTEGER,
    autoIncrement: true,
    primaryKey: true,
  },
  room_code: {
    type: DataTypes.STRING(8),
    allowNull: false,
    unique: true,
  },
  status: {
    type: DataTypes.ENUM('waiting', 'in-progress', 'finished'),
    allowNull: false,
    defaultValue: 'waiting',
  },
  num_participants: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 8,
  },
  duration: {
    type: DataTypes.INTEGER,
    allowNull: false,
    defaultValue: 60,
  },
}, {
  tableName: 'sessions',
  timestamps: true,
});

module.exports = Sessio;
