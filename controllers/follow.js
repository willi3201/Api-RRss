// Importar modelo
const follow = require("../models/follow");
const Follow = require("../models/follow");
const user = require("../models/user");
const Publication = require("../models/publication");

// Importar dependencia
const mongoosePaginate = require("mongoose-pagination");

// Importar servicio
const followService = require("../services/followService")

// Acciones de prueba
const pruebaFollow = (req, res) => {
    res.status(200).send({
        message: "Mensaje enviado desde: controlers/follow.js"
    });
}

// Acción de guardar un follow (accion seguir)
const save = (req, res) => {
    // Conseguir datos por body
    const params = req.body;

    // Sacar id usuario identificado
    const identity = req.user;

    // Crear objeto con modelo follow
    let userToFollow = new follow({
        user: identity.id,
        followed: params.followed
    });

    // Guardar objeto en bd
    userToFollow.save().then((followStored) => {
        return res.status(200).send({
            status: "Success",
            identity: req.user,
            follow: followStored
        });
    }).catch((error) => {
        return res.status(404).send({
            status: "Error",
            message: "Error al seguir al usuario",
            error
        })
    })


}

// Acción de borrar un follow (accion dejar de seguir)
const unfollow = (req, res) => {
    // Recoger id usuario identificado
    const userId = req.user.id;

    // Recoger id usuario a dejar de seguir
    const followedId = req.params.id;

    // Find de coincidencias y hacer remove 
    follow.find({
        "user": userId,
        "followed": followedId
    }).deleteOne()
        .then((userToUnfollow) => {
            if (userToUnfollow.deletedCount == 0) {
                return res.status(404).send({
                    status: "Error",
                    message: "No existen registros a eliminar"
                });
            }
            return res.status(200).send({
                status: "Success",
                message: "Follow eliminado correctamente",
                userToUnfollow
            });
        }).catch((error) => {
            return res.status(404).send({
                status: "Error",
                message: "No se ha encontrado registros",
                error
            });
        });

}

// Acción listado de usuarios que cualquier usuario está siguiendo 
const following = (req, res) => {
    console.log(req.user)
    // Sacar id usuario identificado
    let userId = req.user.id;

    // Comprobar id por parametros en url
    if (req.params.id) userId = req.params.id;

    // Comprobar si llega pagina
    let page = 1;

    if (req.params.page) page = parseInt(req.params.page);

    // Usuarios por pagina
    let itemsPerPage = 5;

    // Find a follow, popular datos de los usuario y paginar con mongoose
    follow.find({ user: userId })
        .populate("user followed", "-password -email -created_at -role -__v")
        // .select({_id:0,create_at:0,__v:0})
        .paginate(page, itemsPerPage)
        .then(async (follows) => {
            const total = await follow.countDocuments({ user: userId }).exec();
            // Sacar array de ids de los usuarios que me siguen y los que sigo como victor
            let followUserId = await followService.followUserIds(req.user.id);

            return res.status(200).send({
                status: "Success",
                message: "Listado de usuarios que estoy siguiendo",
                totalFollows: total,
                page: page,
                pages: Math.ceil(total / itemsPerPage),
                follows,
                user_following: followUserId.following,
                followers: followUserId.followers
            });
        }).catch((error) => {
            return res.status(401).send({
                status: "Error",
                message: "No se a encontrado usuario",
                error: error
            })
        })
    // Listado de usuarios de trinity, y soy victor

}

// Acción listado de usuarios que siguen a cualquier otro usuario(Soy seguido y mis seguidores)
const followers = (req, res) => {

    // Sacar id usuario identificado
    let userId = req.user.id;

    // Comprobar id por parametros en url
    if (req.params.id) userId = req.params.id;

    // Comprobar si llega pagina
    let page = 1;

    if (req.params.page) page = parseInt(req.params.page);

    // Usuarios por pagina
    let itemsPerPage = 5;

    // Find a follow, popular datos de los usuario y paginar con mongoose
    follow.find({ followed: userId })
        .populate("user", "-password -email -created_at -role -__v")
        .paginate(page, itemsPerPage)
        .then(async (follows) => {
            const total = await follow.countDocuments({ followed: userId }).exec();
            // Sacar array de ids de los usuarios que me siguen y los que sigo como victor
            let followUserId = await followService.followUserIds(req.user.id);
            console.log(follows);
            return res.status(200).send({
                status: "Success",
                message: "Listado de usuarios que me siguen",
                follows,
                total,
                pages: Math.ceil(total / itemsPerPage),
                user_following: followUserId.following,
                user_follow_me: followUserId.followers
            });
        }).catch((error) => {
            return res.status(401).send({
                status: "Error",
                message: "No se a encontrado usuario",
                error: error
            })
        })
}

const counters = async (req,res)=>{

    let userId = req.user.id;

    if(req.params.id){
        userId = req.params.id
    }

    try {
        const following = await Follow.count({"user":userId});

        const followed = await Follow.cont({"followed":userId});

        const publications = await Publication.count({"user":userId});

        return res.status(200).send({
            userId,
            following: following,
            followed: followed,
            publications: publications
        })
    } catch (error) {
        return res.status(500).send({
            status:"error",
            message:"Error en los contadores",
            error
        })
    }
}


// Exportar acciones
module.exports = {
    pruebaFollow, save, unfollow, following, followers, counters
}