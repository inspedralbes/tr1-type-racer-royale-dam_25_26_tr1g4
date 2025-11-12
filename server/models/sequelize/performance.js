const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Performance = sequelize.define('Performance', {
    // Define attributes for Performance
    // This is just for association purposes, table is created manually
  }, {
    tableName: 'performances',
    timestamps: false
  });

  Performance.associate = (models) => {
    Performance.belongsTo(models.User, {
      foreignKey: 'user_id'
    });
  };

  return Performance;
};