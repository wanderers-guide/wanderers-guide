const Sequelize = require("sequelize");
const db = require("../../config/databases/content-database");

const CampaignAccessToken = db.define("campaignAccessTokens", {
  campaignID: {
    type: Sequelize.INTEGER,
  },
  charID: {
    type: Sequelize.INTEGER,
  },
  userID: {
    type: Sequelize.INTEGER,
  },
});

module.exports = CampaignAccessToken;
