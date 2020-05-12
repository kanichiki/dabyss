const line = require("@line/bot-sdk");
const { Client } = require('pg');
const pg = new Client(process.env.DATABASE_URL);

pg.connect().catch((error) => {
    console.log('Error connecting to database', error)
})

const config = {
    channelAccessToken: process.env.channelAccessToken,
    channelSecret: process.env.channelSecret
};

const client = new line.Client(config);

module.exports = class ParticipantList {


    /**
     * 参加者リスト
     * Creates an instance of ParticipantList.
     * 
     */
    constructor() {

    }

    /**
     * 参加者リストを作成
     * デフォルトで発言者をuseridsに追加　→廃止
     *
     * @param {*} groupId
     * @returns
     */

    async createPaticipantList(groupId) {
        const userIds = [];
        const query = {
            text: 'INSERT INTO participant_list (group_id,user_ids) VALUES ($1,$2);',
            values: [groupId, userIds]
        }
        try {
            await pg.query(query);
            console.log("Paticipant List Inserted");
        } catch (err) {
            console.log(err);
            console.log("新しい参加者リスト作れんかったよ");
        }
    }


    /**
    * 当該plIdの参加者リストを返す
    *
    * @param {*} plId
    * @returns
    */

    async getUserIds(plId) {
        const query = {
            text: 'SELECT user_ids FROM participant_list WHERE id = $1',
            values: [plId]
        }
        try {
            const res = await pg.query(query);
            console.log(res.rows[0].user_ids);
            return res.rows[0].user_ids;
        } catch (err) {
            console.log(err);
        }
    }


    /**
     * 発言者をplIdの参加者リストに追加
     *
     * @param {*} plId
     * @param {*} userId
     * @returns
     */

    async addUserToPaticipantList(plId, userId) {
        const query = {
            text: 'UPDATE participant_list SET user_ids = array_append(user_ids, $1) WHERE id = $2;',
            values: [userId, plId]
        }
        try {
            await pg.query(query);
            console.log("Added Participant");
        } catch (err) {
            console.log(err);
            console.log("ここだよ")
        }
    }


    /**
     * userIdの発言者がplIdの参加者リストに含まれるかどうか
     *
     * @param 
     * @param
     * @returns boolean
     */

    async isUserParticipant(plId, userId) {
        const userIds = await this.getUserIds(plId);
        let res = false;
        for (const id of userIds) {
            if (userId == id) {
                res = true;
            }
        }
        return res;
    }

    // ここから募集状況（is_recruiting）に関する関数


    /**
    * 発言グループが募集中の参加者リストを有するかどうかを返す
    *
    * @param
    * @returns
    */
    async hasGroupRecruitingParticipantList(groupId) {
        const query = {
            text: 'SELECT id FROM participant_list WHERE group_id = $1 AND is_recruiting = true;',
            values: [groupId]
        }
        try {
            const res = await pg.query(query);
            if (res.rowCount == 1) {
                console.log("true");
                return true;
            } else if (res.rowCount > 1) {
                throw "募集中の参加者リストが１グループに２つ以上ある";
            } else {
                console.log("false");
                return false;
            }
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * plIdの参加者リストの募集を解除する
     * is_recruitingをfalseにする
     *
     * @param {*} plId
     */

    async updateIsRecruitingFalse(plId) {
        const query = {
            text: 'UPDATE participant_list set is_recruiting = false where id = $1',
            values: [plId]
        }
        try {
            await pg.query(query);
        } catch (err) {
            console.log(err);
            console.log("is_recruitingをfalseにできんやった");
        }
    }

    /**
     * groupIdの参加者リストの募集中をすべて解除する
     * is_recruitingをfalseにする
     *
     * @param {*} groupId
     */

    async updateIsRecruitingOfGroupFalse(groupId) {
        const query = {
            text: 'UPDATE participant_list set is_recruiting = false where group_id = $1',
            values: [groupId]
        }
        try {
            await pg.query(query);
        } catch (err) {
            console.log(err);
            console.log("is_recruitingを全部falseにできんやった");
        }
    }


    /**
     * groupIdのグループの募集中の参加者リストのidを返す
     * is_recruitingをすべてfalseにする前に実行するよう注意
     * なかったら-1を返す
     * 嘘、返さない
     *
     * @returns
     */

    async getRecruitingParticipantListId(groupId) {
        const query = {
            text: 'SELECT id FROM participant_list WHERE group_id = $1 AND is_recruiting = true;',
            values: [groupId]
        }
        try {
            const res = await pg.query(query);
            return res.rows[0].id;
        } catch (err) {
            console.log(err);
            return -1;
        }
    }


    // ここまで募集状況

    // ここからプレイ状況（is_playing）に関する関数

    /**
    * 発言グループがプレイ中の参加者リストを有するかどうかを返す
    *
    * @param
    * @returns
    */
    async hasGroupPlayingParticipantList(groupId) {
        const query = {
            text: 'SELECT id FROM participant_list WHERE group_id = $1 AND is_playing = true;',
            values: [groupId]
        }
        try {
            const res = await pg.query(query);
            if (res.rowCount == 1) {
                console.log("true");
                return true;
            } else if (res.rowCount > 1) {
                throw "プレイ中の参加者リストが１グループに２つ以上ある";
            } else {
                console.log("false");
                return false;
            }
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * 参加者リストをPlay中にする
     * is_playingをtrueにする
     * 
     * 必ずis_recruitingをfalseにする前に実行する
     *
     * @param {*} plId
     */

    async updateIsPlayingTrue(plId) {
        const query = {
            text: 'UPDATE participant_list set is_playing = true where id = $1',
            values: [plId]
        };
        try {
            await pg.query(query);
            console.log("This group began to set");
        } catch (err) {
            console.log(err);
            console.log("is_playingをtrueにできんやった");
        }
    }

    /**
     * 参加者リストのPlay中を解除する
     * is_playingをfalseにする
     *
     * @param {*} plId
     */

    async updateIsPlayingFalse(plId) {
        const query = {
            text: 'UPDATE participant_list set is_playing = false where id = $1',
            values: [plId]
        };
        try {
            await pg.query(query);
        } catch (err) {
            console.log(err);
            console.log("is_playingをfalseにできんやった");
        }
    }

    /**
     * groupIdのグループの参加者リストのPlay中をすべて解除する
     * is_playingをfalseにする
     *
     * @param {*} groupId
     */

    async updateIsPlayingOfGroupFalse(groupId) {
        const query = {
            text: 'UPDATE participant_list set is_playing = false where group_id = $1',
            values: [groupId]
        }
        try {
            await pg.query(query);
            console.log("This group began to play");
        } catch (err) {
            console.log(err);
            console.log("is_playingを全部falseにできんやった");
        }
    }

    /**
     * 発言グループのプレイ中の参加者リストのidを返す
     * なかったら-1を返す
     * 嘘、返さない
     *
     * @param {*} groupId
     * @returns
     */
    async getPlayingParticipantListId(groupId) {
        const query = {
            text: 'SELECT id FROM participant_list WHERE group_id = $1 AND is_playing = true;',
            values: [groupId]
        }
        try {
            const res = await pg.query(query);
            return res.rows[0].id;
        } catch (err) {
            console.log(err);
        }
    }

    // ここまでプレイ状況

    // ここからリスタート待ち状況（is_restarting）に関する関数
    // リスタート待ち状況とは募集中、並びにプレイ中にゲーム名が発言された場合に本当にリスタートするか確認待ちの状況

    /**
    * 発言グループがリスタート待ちの参加者リストを有するかどうかを返す
    *
    * @param
    * @returns
    */
    async hasGroupRestartingParticipantList(groupId) {
        const query = {
            text: 'SELECT id FROM participant_list WHERE group_id = $1 AND is_restarting = true;',
            values: [groupId]
        }
        try {
            const res = await pg.query(query);
            if (res.rowCount == 1) {
                console.log("true");
                return true;
            } else if (res.rowCount > 1) {
                throw "リスタート待ちの参加者リストが１グループに２つ以上ある";
            } else {
                console.log("false");
                return false;
            }
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * 参加者リストをリスタート待ちにする
     * is_restartingをtrueにする
     *
     * @param {*} plId
     */

    async updateIsRestartingTrue(plId) {
        const query = {
            text: 'UPDATE participant_list set is_restarting = true where id = $1',
            values: [plId]
        };
        try {
            await pg.query(query);
        } catch (err) {
            console.log(err);
            console.log("is_restartingをtrueにできんやった");
        }
    }

    /**
     * 参加者リストのリスタート待ちを解除する
     * is_restartingをfalseにする
     *
     * @param {*} plId
     */

    async updateIsRestartingFalse(plId) {
        const query = {
            text: 'UPDATE participant_list set is_restarting = false where id = $1',
            values: [plId]
        };
        try {
            await pg.query(query);
        } catch (err) {
            console.log(err);
            console.log("is_restartingをfalseにできんやった");
        }
    }

    /**
     * groupIdのグループの参加者リストのリスタート待ちをすべて解除する
     * is_restartingをfalseにする
     *
     * @param {*} groupId
     */

    async updateIsRestartingOfGroupFalse(groupId) {
        const query = {
            text: 'UPDATE participant_list set is_restarting = false where group_id = $1',
            values: [groupId]
        }
        try {
            await pg.query(query);
        } catch (err) {
            console.log(err);
            console.log("is_restartingを全部falseにできんやった");
        }
    }

    /**
     * 発言グループのリスタート待ちの参加者リストのidを返す
     * これ絶対使わんくない？
     *
     * @param {*} groupId
     * @returns
     */
    async getRestartingParticipantListId(groupId) {
        const query = {
            text: 'SELECT id FROM participant_list WHERE group_id = $1 AND is_restarting = true;',
            values: [groupId]
        }
        try {
            const res = await pg.query(query);
            return res.rows[0].id;
        } catch (err) {
            console.log(err);
        }
    }

    // ここまでリスタート待ち状況

    /**
     * 参加者の表示名の配列を返す
     *
     * @param plId
     * @returns
     */

    async getDisplayNames(plId) {
        const profiles = [];
        const userIds = await this.getUserIds(plId);
        try {
            for (const userId of userIds) {
                const profile = await client.getProfile(userId).then(profile =>
                    profiles.push(profile.displayName)
                );
            }
            return profiles;
        } catch (err) {
            console.log(err);
        }
    }





    /**
     * plIdの参加者リストの参加ユーザー数を返す
     *
     * @param {*} plId
     * @returns
     */
    async getUserNumber(plId) {
        const query = {
            text: 'SELECT user_ids FROM participant_list WHERE id = $1',
            values: [plId]
        }
        try {
            const res = await pg.query(query);
            return res.rows[0].user_ids.length;
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * 与えられたplIdのuserIdのリストから与えられたindexのuserIdを返す
     *
     * @param {*} plId
     * @param {*} index
     * @returns
     */
    async getUserId(plId, index) {
        try {
            const userIds = await this.getUserIds(plId);
            return userIds[index];
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * 与えられた表示名に一致するインデックスを取得する
     *
     * @param {*} plId
     * @param {*} name
     * @returns
     */
    async getUserIndexFromName(plId, name) {
        try {
            const displayNames = await this.getDisplayNames(plId);
            let index = -1;
            for (let i = 0; i < displayNames.length; i++) {
                if (displayNames[i] == name) {
                    index = i;
                }
            }
            return index;
        } catch (err) {
            console.log(err);
        }
    }

    /**
     * 与えられたuserIdのユーザーのインデックスを取得する
     *
     * @param {*} plId
     * @param {*} userId
     * @returns
     */
    async getUserIndexFromUserId(plId, userId) {
        try {
            const userIds = await this.getUserIds(plId);
            let index = -1;
            for (let i = 0; i < userIds.length; i++) {
                if (userIds[i] == userId) {
                    index = i;
                }
            }
            return index;
        } catch (err) {
            console.log(err);
        }
    }


}