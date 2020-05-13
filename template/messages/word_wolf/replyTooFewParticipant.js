exports.main = async (displayNames,userNumber,recruitingGameName) => {
    const displayNamesSan = displayNames.join("さん、\n");

    return [
        {
            type: "text",
            text: `現在の参加者数は${userNumber}人です\nワードウルフを始めるには3人以上必要です`
        },
        {
            type: "text",
            text: `現在の参加者は\n\n${displayNamesSan}さん\n\nです！\n引き続き${recruitingGameName}の参加者を募集しています！`
        },
        {
            "type": "flex",
            "altText": "参加募集",
            "contents": {
                "type": "bubble",
                "footer": {
                    "type": "box",
                    "layout": "vertical",
                    "spacing": "sm",
                    "contents": [
                        {
                            "type": "button",
                            "style": "link",
                            "height": "sm",
                            "action": {
                              "type": "message",
                              "label": "参加",
                              "text": "参加"
                            }
                          },
                          {
                            "type": "separator"
                          },
                          {
                            "type": "button",
                            "style": "link",
                            "height": "sm",
                            "action": {
                              "type": "message",
                              "label": "受付終了",
                              "text": "受付終了"
                            }
                          },
                          {
                            "type": "spacer",
                            "size": "sm"
                          }
                    ],
                    "flex": 0
                }
            }
        }
    ]
}