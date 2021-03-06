const express = require('express');
const router = express.Router();
const line = require("@line/bot-sdk");
const request = require('request');

const debugLogger = require("../modules/log4js").debugLogger;

const ParticipantList = require("../classes/ParticipantList");
const PlayingGame = require("../classes/PlayingGame");
const WordWolf = require("../classes/WordWolf");
const CrazyNoisy = require("../classes/CrazyNoisy");
const User = require("../classes/User");
const Game = require("../classes/Game");

const wordWolfBranch = require("./wordWolfBranch");
const crazyNoisyBranch = require("./crazyNoisyBranch");


const config = {
  channelAccessToken: process.env.channelAccessToken,
  channelSecret: process.env.channelSecret
};

const client = new line.Client(config);


/** 
 * Webhookルーティング部分
 */

router.post('/', (req, res, next) => {
  main(req, res);
});


/**
 * Webhook処理のメイン関数
 *
 * @param {*} req
 * @param {*} res
 */

const main = async (req, res) => {
  res.status(200).end(); // 先に200を返してあげる

  const events = req.body.events;
  try {
    // イベント内容をログに保存
    console.log(events);
  } catch (err) {
    console.log(err);
  }
  // const promises = [];
  for (const event of events) {
    const eventType = event.type;
    const pl = new ParticipantList();
    const userId = event.source.userId;
    const user = new User(userId);
    const replyToken = event.replyToken;

    // const usePostback = true;
    let isFriend = true;
    try {
      await client.getProfile(userId);
    } catch{
      isFriend = false;
    }

    if (isFriend) {
      if (eventType == "message") {

        const text = event.message.text;
        const toType = event.source.type;

        if (toType == "group" || toType == "room") {
          let groupId = ""
          if (toType == "group") {
            groupId = event.source.groupId;
          } else if (toType == "room") {
            groupId = event.source.roomId; // roomIdもgroupId扱いしよう
          }

          if (text == "ゲーム一覧") {
            await replyGameList(replyToken);
          }


          // TODO 友達追加されていないユーザーの場合の分岐
          // 初めの処理
          const isUser = await user.isUser();
          if (isUser) {
            if (text != "参加") {
              await user.updateIsRestartingFalse(); // もし「参加」以外の言葉がユーザーから発言されたら確認状況をリセットする
            }
          }

          const gameNameExists = await Game.gameNameExists(text);
          if (gameNameExists) {
            const gameId = await Game.getGameIdFromName(text);

            const isRestarting = await pl.hasGroupRestartingParticipantList(groupId);
            const isRecruiting = await pl.hasGroupRecruitingParticipantList(groupId);
            const isPlaying = await pl.hasGroupPlayingParticipantList(groupId);
            if (isRestarting) {
              // ここの内容は※1マークのところと同じになるように
              // 本当は統合したいが条件分岐がぐちゃぐちゃになる

              await replyRollCall(groupId, gameId, isRestarting, replyToken);
              continue;
            } else if (isRecruiting) {

              // 参加者募集中のゲームがあるが新しくゲームの参加者を募集するかどうかを聞く旨のリプライを返す
              const plId = await pl.getRecruitingParticipantListId(groupId); // 募集中の参加者リストのidを取得
              await replyRestartConfirmIfRecruiting(plId, gameId, replyToken);
              continue;

            } else if (isPlaying) {

              const plId = await pl.getPlayingParticipantListId(groupId);
              const isUserParticipant = await pl.isUserParticipant(plId, userId); // 発言ユーザーが参加者かどうか
              if (isUserParticipant) { // 参加者の発言の場合

                // プレイ中のゲームがあるが新しくゲームの参加者を募集するかどうかを聞く旨のリプライを返す
                await replyRestartConfirmIfPlaying(plId, gameId, replyToken);
                continue;
              }

            } else {
              // ※1
              // 参加を募集する旨のリプライを返す
              await replyRollCall(groupId, gameId, isRestarting, replyToken);
              continue;
            }
          } else { // 発言の内容がゲーム名じゃないなら
            await pl.updateIsRestartingOfGroupFalse(groupId); // 発言グループのリスタート待ちを解除

            // 発言グループに募集中の参加者リストがあるかどうか
            const isRecruiting = await pl.hasGroupRecruitingParticipantList(groupId);
            if (isRecruiting) { // 参加者募集中の場合
              const plId = await pl.getRecruitingParticipantListId(groupId); // 発言グループの募集中の参加者リストを返す

              if (text == "参加") {
                if (isUser) { // ユーザーテーブルにデータがあるか
                  const hasPlId = await user.hasPlId();
                  const isUserRestarting = await user.isRestarting();
                  if (hasPlId) { // ユーザーに参加中の参加者リストがある場合

                    const isUserParticipant = await pl.isUserParticipant(plId, userId)
                    if (!isUserParticipant) { // そのplIdがグループで募集中のものと違うなら（つまり参加中じゃないなら）

                      if (isUserRestarting) { // 確認した上で参加と言ってるなら

                        // この内容は※2と一致
                        // 参加意思表明に対するリプライ
                        // 参加を受け付けた旨、現在の参加者のリスト、参加募集継続中の旨を送る
                        await replyRollCallReaction(plId, userId, isUser, isUserParticipant, isUserRestarting, replyToken);
                        continue;
                      } else { // まだ確認してなかったら

                        await replyParticipateConfirm(userId, replyToken);
                        continue;
                      }
                    } else {
                      // ※2
                      // 参加意思表明に対するリプライ
                      // 参加を受け付けた旨、現在の参加者のリスト、参加募集継続中の旨を送る
                      await replyRollCallReaction(plId, userId, isUser, isUserParticipant, isUserRestarting, replyToken);
                      continue;
                    }
                  } else { // 参加中参加者リストがない場合
                    const isUserParticipant = false; // 便宜的に
                    // ※2
                    // 参加意思表明に対するリプライ
                    // 参加を受け付けた旨、現在の参加者のリスト、参加募集継続中の旨を送る
                    await replyRollCallReaction(plId, userId, isUser, isUserParticipant, isUserRestarting, replyToken);
                    continue;
                  }
                } else { // ユーザーテーブルにデータがない場合
                  const isUserRestarting = false; // 便宜的に
                  const isUserParticipant = false;
                  // ※2
                  // 参加意思表明に対するリプライ
                  // 参加を受け付けた旨、現在の参加者のリスト、参加募集継続中の旨を送る
                  await replyRollCallReaction(plId, userId, isUser, isUserParticipant, isUserRestarting, replyToken);
                  continue;
                }
              }

              const isUserParticipant = await pl.isUserParticipant(plId, userId); // 発言ユーザーが参加者かどうか
              if (isUserParticipant) { // 参加受付を終了できるのは参加済みの者のみ

                if (text == "受付終了") {
                  const playingGame = new PlayingGame(plId);
                  const gameId = await playingGame.getGameId();
                  if (gameId == 1) { // ワードウルフの場合

                    await wordWolfBranch.rollCallBranch(plId, replyToken);
                    continue;
                  }
                  if (gameId == 2) { // クレイジーノイジーの場合

                    await crazyNoisyBranch.rollCallBranch(plId, replyToken);
                    continue;
                  }
                  if (gameId == 3) { // 人狼の場合
                    const options = {
                      uri: "http://localhost:8000/rollcall",
                      headers: {
                        "Content-type": "application/json"
                      },
                      // これがpythonに渡される
                      json: {
                        "replyToken": replyToken,
                        "pl_id": plId
                      }
                    };
                    request.post(options, (error, response, body) => { });
                    pl.updateIsRecruitingFalse();
                    pl.updateIsPlayingTrue();
                  }
                }
              }
            }

            // 発言グループにプレイ中の参加者リストがあるかどうか（参加受付終了した時点で募集中からプレイ中に変更してある）
            const isPlaying = await pl.hasGroupPlayingParticipantList(groupId);
            if (isPlaying) {　// プレイ中の場合

              const plId = await pl.getPlayingParticipantListId(groupId);
              const isUserParticipant = await pl.isUserParticipant(plId, userId); // 発言ユーザーが参加者かどうか
              if (isUserParticipant) { // 参加者の発言の場合
                if (text == "強制終了") {
                  await replyTerminate(plId, replyToken);
                  continue;
                }

                const playingGame = new PlayingGame(plId);
                const gameId = await playingGame.getGameId();
                if (gameId == 1) { // プレイするゲームがワードウルフの場合

                  await wordWolfBranch.playingMessageBranch(plId, text, replyToken);
                  continue;
                }
                if (gameId == 2) { // プレイするゲームがクレイジーノイジーの場合

                  await crazyNoisyBranch.playingMessageBranch(plId, text, replyToken);
                  continue;
                }
                if (gameId == 3) { // 人狼の場合

                }
              }
            }
          }

          // await replyDefaultGroupMessage(event));

        } else if (toType == "user") {
          const hasPlId = await user.hasPlId();
          if (hasPlId) { // 参加中の参加者リストがあるなら
            const plId = await user.getPlid();

            const playingGame = new PlayingGame(plId);
            const gameId = await playingGame.getGameId();

            if (gameId == 2) {

              // await crazyNoisyBranch.userMessageBranch();
            }
          }
        }


      } else if (eventType == "postback") {
        const toType = event.source.type;
        const postbackData = event.postback.data;

        if (toType == "group" || toType == "room") {
          let groupId = ""
          if (toType == "group") {
            groupId = event.source.groupId;
          } else if (toType == "room") {
            groupId = event.source.roomId; // roomIdもgroupId扱いしよう
          }

          const isPlaying = await pl.hasGroupPlayingParticipantList(groupId);
          if (isPlaying) {
            const plId = await pl.getPlayingParticipantListId(groupId);
            const isUserParticipant = await pl.isUserParticipant(plId, userId);
            if (isUserParticipant) {
              const playingGame = new PlayingGame(plId);
              const gameId = await playingGame.getGameId();
              if (event.postback.params != undefined) {
                const params = event.postback.params;

                if (gameId == 1) {
                  await wordWolfBranch.postbackDatetimeBranch(plId, userId, params, replyToken);
                  continue;
                }
                if (gameId == 2) {
                  await crazyNoisyBranch.postbackDatetimeBranch(plId, userId, params, replyToken);
                  continue;
                }
                if (gameId == 3) { // 人狼の場合

                }
              } else {
                if (gameId == 1) {
                  await wordWolfBranch.postbackPlayingBranch(plId, userId, postbackData, replyToken);
                  continue;
                }
                if (gameId == 2) {
                  await crazyNoisyBranch.postbackPlayingBranch(plId, userId, postbackData, replyToken);
                  continue;
                }
                if (gameId == 3) { // 人狼の場合

                }
              }
            }
          }
        } else if (toType == "user") {
          const hasPlId = await user.hasPlId();
          if (hasPlId) { // 参加中の参加者リストがあるなら
            const plId = await user.getPlid();

            const playingGame = new PlayingGame(plId);
            const gameId = await playingGame.getGameId();

            if (gameId == 2) {

              await crazyNoisyBranch.postbackUserBranch(plId, userId, postbackData, replyToken);
            }

            if (gameId == 3) { // 人狼の場合

            }
          }
        }

      }
    }
    if (eventType == "join") {
      if (event.source.type == "group" || event.source.type == "room") {
        await joinGroupMessage(event.replyToken);
      }
    }
  };

  // Promise.all(promises).then(console.log("成功")).catch(err => console.log(err));
}

const joinGroupMessage = async (replyToken) => {
  const replyMessage = require("../template/messages/joinGroupMessage");
  client.replyMessage(replyToken, await replyMessage.main());
}


/**
 * 個チャのデフォルトリプライ
 *
 * @param {*} event
 * @returns
 */

/*
const replyDefaultPersonalMessage = async (event) => {
 const pro = await client.getProfile(event.source.userId);
 // await viewSource(event);

 return client.replyMessage(event.replyToken, [
   {
     type: "text",
     text: `${pro.displayName}さん、今「${event.message.text}」って言いました？`
   }
 ])
}

*/


/**
 * ゲームリストを返す
 *
 * @param {*} replyToken
 */
const replyGameList = async (replyToken) => {
  const replyMessage = require("../template/messages/replyGameList");
  return client.replyMessage(replyToken, await replyMessage.main());
}

/**
 * 参加受付用リプライ
 * 
 * DB変更操作は以下の通り
 * １．発言グループの参加者リストの募集中、プレイ中、その他ステータス、ユーザーの参加中を解除
 * ２．participant_listテーブルにデータを挿入
 * ３．遊ぶゲームをgameテーブルに追加
 * 
 * TODO 友達追加されてなかった場合はプレイヤー1などとする いや無理かこれは
 *
 * @param {*} groupId
 * @param {*} gameId
 * @param {*} isRestarting
 * @param {*} replyToken
 */
const replyRollCall = async (groupId, gameId, isRestarting, replyToken) => {
  const replyMessage = require("../template/messages/replyRollCall");
  const pl = new ParticipantList();


  // DB変更操作１
  if (isRestarting) {
    const oldPlId = await pl.getRestartingParticipantListId(groupId); // リスタート待ちの参加者リストとってくる
    pl.finishParticipantList(oldPlId);
  }

  // DB変更操作２
  await pl.createPaticipantList(groupId);
  const plId = await pl.getRecruitingParticipantListId(groupId);

  // DB変更操作３
  const playingGame = new PlayingGame(plId);
  playingGame.createPlayingGame(gameId);
  const gameName = await Game.getGameName(gameId);


  client.replyMessage(replyToken, await replyMessage.main(gameName));

}


/**
 * 参加意思表明に対するリプライ
 * 
 * DB変更操作は以下の通り
 * １．ユーザーが参加済みでない場合、参加者リストに追加
 * ２．ユーザーのpl_idを入れてあげる
 * ３．リスタート待ちだった場合、前の参加者リストを全部終わらせる
 * ２’．　ユーザーのデータがなかったら作る
 *
 * @param {*} plId
 * @param {*} userId
 * @param {*} isUser
 * @param {*} isUserParticipant
 * @param {*} isUserRestarting
 * @param {*} replyToken
 * @returns
 */
const replyRollCallReaction = async (plId, userId, isUser, isUserParticipant, isUserRestarting, replyToken) => {
  const pl = new ParticipantList();
  const user = new User(userId);

  const recruitingGame = new PlayingGame(plId);
  const recruitingGameName = await recruitingGame.getGameName();

  const displayName = await user.getDisplayName();

  // DB変更操作１
  if (!isUserParticipant) { // ユーザーがまだ参加してない場合
    const displayNameExists = await pl.displayNameExists(plId, displayName);
    if (!displayNameExists) { // 同じ名前の参加者が存在しなければ

      const replyMessage = require("../template/messages/replyRollCallReaction");

      await pl.addUserIdToUserIds(plId, userId);
      await pl.addDisplayNameToDisplayNames(plId, displayName);
      if (isUser) { // ユーザーデータがある場合
        if (isUserRestarting) { // ユーザーがリスタート待ちの場合

          const hasPlId = await user.hasPlId();
          if (hasPlId) { // リスタート待ちの間に消えてる可能性もあるので

            const pushMessage = require("../template/messages/pushGameFinish");

            await user.updateIsRestartingFalse(); // is_restartingをfalseにしてあげる

            const oldPlId = await user.getPlid();
            await pl.finishParticipantList(oldPlId); // ここで前の参加者リストを全部終わらせる
            const oldGroupId = await pl.getGroupId(oldPlId);

            try {
              // 終了したゲームのグループにその旨を送る
              await client.pushMessage(oldGroupId, await pushMessage.main());
            } catch (err) {

            }
          }
        }

        await user.updatePlId(plId); // これはあとに実行しないとこのplIdが消えちゃう

      } else { // ユーザーデータがない場合
        await user.createUser(plId);
      }

      const displayNames = await pl.getDisplayNames(plId); // 参加者リストのユーザー全員の表示名の配列
      return client.replyMessage(replyToken, await replyMessage.main(recruitingGameName, displayName, isUserParticipant, displayNames));

    } else { // 同じ名前のユーザーが存在するなら
      const replyMessage = require("../template/messages/replyDisplayNameExists");
      return client.replyMessage(replyToken, await replyMessage.main());
    }



  } else { // 既に参加していた場合
    const replyMessage = require("../template/messages/replyRollCallReaction");
    const displayNames = await pl.getDisplayNames(plId); // 参加者リストのユーザー全員の表示名の配列
    return client.replyMessage(replyToken, await replyMessage.main(recruitingGameName, displayName, isUserParticipant, displayNames));
  }


}

/**
 * ユーザーに他に参加中のゲームがある場合に「参加」と送られてきたときのリプライ
 * 
 * DB変更操作は以下の通り
 * １．is_restartingをtrueにする
 *
 * @param {*} userId
 * @param {*} replyToken
 * @returns
 */
const replyParticipateConfirm = async (userId, replyToken) => {
  const replyMessage = require("../template/messages/replyParticipateConfirm");
  const user = new User(userId);

  // DB変更操作１．
  user.updateIsRestartingTrue(); // 確認状況をtrueにする
  const displayName = await user.getDisplayName();

  return client.replyMessage(replyToken, await replyMessage.main(displayName));
}


/**
 * 参加募集中にゲーム名が発言された際のリプライ
 * 
 * DB変更操作は以下の通り
 * １．参加者リストをリスタート待ちにする
 *
 * @param {*} plId
 * @param {*} gameId
 * @param {*} replyToken
 */
const replyRestartConfirmIfRecruiting = async (plId, gameId, replyToken) => {
  const replyMessage = require("../template/messages/replyRestartConfirmIfRecruiting");
  const pl = new ParticipantList();
  const recruitingGame = new PlayingGame(plId);

  // DB変更操作１
  pl.updateIsRestartingTrue(plId); // 参加者リストをリスタート待ちにする

  const recruitingGameName = await recruitingGame.getGameName();
  const newGameName = await Game.getGameName(gameId);

  // 一応newGameNameも渡すがまだ使ってない
  // TODO is_restartingをrestart_game_idに変更する
  return client.replyMessage(replyToken, await replyMessage.main(recruitingGameName, newGameName));
}

/**
 * プレイ中にゲーム名が発言された際のリプライ
 * 
 * DB変更操作は以下の通り
 * １．参加者リストをリスタート待ちにする
 *
 * @param {*} plId
 * @param {*} gameId
 * @param {*} replyToken
 * @returns
 */
const replyRestartConfirmIfPlaying = async (plId, gameId, replyToken) => {
  const replyMessage = require("../template/messages/replyRestartConfirmIfPlaying");
  const pl = new ParticipantList();
  const playingGame = new PlayingGame(plId);

  // DB変更操作１
  pl.updateIsRestartingTrue(plId); // 参加者リストをリスタート待ちにする

  const playingGameName = await playingGame.getGameName();
  const newGameName = await Game.getGameName(gameId);

  // 一応newGameNameも渡すがまだ使ってない
  return client.replyMessage(replyToken, await replyMessage.main(playingGameName, newGameName));
}

const replyTerminate = async (plId, replyToken) => {
  const replyMessage = require("../template/messages/replyTerminate");
  const pl = new ParticipantList();
  pl.finishParticipantList(plId);
  return client.replyMessage(replyToken, await replyMessage.main());
}



module.exports = router;
