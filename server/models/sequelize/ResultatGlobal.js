const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const ResultatGlobal = sequelize.define('ResultatGlobal', {
    // Define attributes for ResultatGlobal
    // This is just for association purposes, table is created manually
  }, {
    tableName: 'resultats_globals',
    timestamps: false
  });

  ResultatGlobal.associate = (models) => {
    ResultatGlobal.belongsTo(models.User, {
      foreignKey: 'user_id'
    });
  };

  return ResultatGlobal;
};
