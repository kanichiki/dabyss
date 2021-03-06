const parts = require("../constants/messageParts");

exports.main = async (timer) => {
    return [
        {
            type: "text",
            text: `全員の確認がとれました！\nありがとうございます！`
        },
        {
            type: "text",
            text: `今後、各役職の人数を確認したい場合は「役職人数確認」と発言してください！`
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
                            "text": `1日目の話し合いをスタートします`,
                            "wrap": true,
                            "weight":"bold"
                        },
                        {
                            "type": "text",
                            "text": `話し合い時間は${timer}です`,
                            "wrap": true,
                            "weight":"bold"
                        },
                        {
                            "type": "text",
                            "text": "話し合いを途中で終了するには「終了」と発言してください",
                            "wrap": true
                        },
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
                        },
                        {
                            "type": "button",
                            "action": {
                              "type": "message",
                              "label": "役職人数確認",
                              "text": "役職人数確認"
                            },
                            "color": parts.subColor
                        }
                    ]
                }
            }
        }
    ]
}