const Follow = require("../models/follow");
const followUserIds = async(identityUserId) =>{
    try{
        // Sacar info de seguimiento
        let following = await Follow.find({"user":identityUserId}).select({"followed":1,"_id":0}).exec();
        // .then((follows)=> follows).catch((error)=> error);
        let followers = await Follow.find({"followed":identityUserId}).select({"user":1,"_id":0}).exec();

        
        // procesar array de identificadores
        let followingClean = [];
        following.forEach(follow => {
            followingClean.push(follow.followed);
        });
        let followersClean = [];
        followers.forEach(follow => {
            followersClean.push(follow.user);
        });
    
        return { following:followingClean,followers:followersClean}
    }catch(error){

    }
}

const followThisUser = async (identityUserId, profileUserId) => {
     // Sacar info de seguimiento
        let following = await Follow.findOne({"user":identityUserId,"followed":profileUserId})
        // .select({"followed":1,"_id":0}).exec();

        let follower = await Follow.findOne({"user":profileUserId,"followed":identityUserId})
        // .select({"user":1,"_id":0}).exec();

        return {
            following,follower
        }
    }

module.exports = {
    followUserIds,followThisUser
}