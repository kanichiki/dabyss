const parts = require("../constants/messageParts");

exports.main = async (displayName) => {
    return [
        {
            type: "text",
            text: `自分には投票できません`
        }
    ]
}