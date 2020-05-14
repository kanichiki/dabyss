const parts = require("../../constants/messageParts");

exports.main = async (timer) => {
    return [
        {
            type: "text",
            text: `ゲームをスタートします\nそれぞれの単語を個人トークルームにて確認してください`
        },
        {
            type: "text",
            text: `話し合い時間は${timer}分です\n話し合いを途中で終了するには「終了」と発言してください`
        },
        {
            "type": "flex",
            "altText": "残り時間",
            "contents": {
                "type": "bubble",
                "body": {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "text",
                            "text": "話し合いの残り時間は下のボタンで確認できます！",
                            "wrap": true
                        }
                    ]
                },
                "footer": {
                    "type": "box",
                    "layout": "vertical",
                    "contents": [
                        {
                            "type": "button",
                            "action": {
                                "type": "postback",
                                "data": "残り時間",
                                "label": "残り時間"
                            },
                            "color": parts.mainColor,
                            "style": "primary"
                        }
                    ]
                }
            }
        }
    ]
}