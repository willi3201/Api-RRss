// Importar dependencias y modulo
const bcrypt = require("bcrypt");
const mongoosePaginate = require("mongoose-pagination");
const fs = require("fs");
const path = require("path");


// Importar modelos
const User = require("../models/user");
const follow = require("../models/follow");
const Publication = require("../models/publication");

// Importar servicios
const jwt = require("../services/jwt");
const followService = require("../services/followService");
const validate = require("../helpers/validate");

// Acciones de prueba
const pruebaUser = (req,res) =>{
    res.status(200).send({
        message: "Mensaje enviado desde: controlers/user.js",
        usuario: req.user
    });
}


// Registro de Usuarios
const register = (req,res) => {
    // Recoger datos de la peticion
    let params = req.body;

    // Comprobar que me llegan bien (+validacion)
    if(!params.name || !params.email || !params.password || !params.nick){
        return res.status(401).json({
            status:"error",
            message: "Faltan datos por enviar"
        });
    }

    // Validación avanzada
    try {
        validate(params);
    } catch (error) {
        return res.status(401).send({
            status:"Error",
            message: "Datos invalidos"
        });
    }

    // Control usuarios duplicados
    User.find({ 
        $or:[
        {email: params.email.toLowerCase()},
        {nick: params.nick.toLowerCase()}

    ]
    }).then(async (users)=>{

        if(users && users.length >= 1){

            return res.status(200).send({
                status: "success",
                message: "El usuario ya existe"
            });
            
        }

        // Cifrar la contraseña
        let pwd = await bcrypt.hash(params.password,10)
        params.password = pwd;

        // Crear objeto de usuario
        let user_save = new User(params);

        // Guardar usuario en la BD
        user_save.save().then(userStored => {
            if(userStored){
                // Devolver resultado
                return res.status(200).json({
                    status: "success",
                    message: "Usuario registrado correctamente",
                    user:user_save 
                });
            }else{
                return res.status(502).send({status:"error",message:"Error al guardar usuario"});
            }
        }).catch(err =>{
            return res.status(501).send({status:"error",message:"Error al guardar usuario"});
        })        
    }).catch((error)=>{
        return res.status(500).json({status:"error",message:"Error en la consulta de usuarios",error})
    })

}

const login = (req,res) => {
    // Recoger los parametros body
    let params = req.body;
    console.log(params.email)
    if(!params.email || !params.password){
        return res.status(401).send({
            status:"Error",
            message: "Faltan datos por enviar"
        });
    }

    // Buscar en la bbdd si existe
    // .select({"password":0})
    User.findOne({ email: params.email})
    .then((user) => {
        if(!user){
            res.status(403).send({
                status:"Error",
                message:"No existe el usuario"
            })
        }
        // Comprobar su contraseña
        let pwd = bcrypt.compareSync(params.password, user.password);
        if(!pwd){
            return res.status(404).send({
                status:"Error",
                message:"No te has identificado correctamente"
            })
        }

        // Devolver Token
        const token = jwt.createToken(user);
        // Eliminar password del objeto

        // Devolver Datos del usuario

        return res.status(200).send({
            status:"Success",
            message:"Bienvenido. Te has identificado correctamente",
            user: {
                id_: user._id,
                name: user.name,
                nick: user.nick,
                surname: user.surname,
                email: user.email,
                role: user.role,
                image: user.image
            },
            token
        });

    }).catch((error) => {
        return res.status(402).send({
            status:"Error",
            message:"No existe el usuario",
            error
        })
    })
}
// MEtodo para devolver un usuario
const profile = (req,res)=>{
    // Recibir el parametro del id de usuario por la url
    const id = req.params.id;
    console.log(req.params.id)
    // Consulta para sacar los datos del usuario
    // const userProfile = await User.findById(id);
    User.findById(id).select({password:0,role:0})
    .then(async (userProfile)=>{
        // Posteriormente: devolver informacion de follows
        let follows = await followService.followThisUser(req.user.id,id);
        
        // Devolver el resultado
        return res.status(200).send({
            status:"success",
            user: userProfile,
            following:follows.following,
            follower:follows.follower
        })
    })
    .catch((error) =>{
            if(!userProfile || error){
                return res.status(404).send({
                    status: "error",
                    message: "El usuario no existe o hay un error"
            })
        } 
    })
}

const list = (req,res)=>{
    // Controlar en que pagina estamos
    let page=1;
    if(req.params.page){
        page=req.params.page;
    }
    page = parseInt(page);
    // Consulta con mongoose paginate
    let itemsPerPage = 5;
    User.find().sort('_id')
    .select("-password -email -role -__v").paginate(page,itemsPerPage).then(async (users)=>{
        // Get total users
        const totalUsers = await User.countDocuments({}).exec();
        if(!users){
            return res.status(403).send({
                status: "error",
                message: "No hay usuarios"
            })
        }

        // Sacar array de ids de los usuarios que me siguen y los que sigo como victor
        let followUserId = await followService.followUserIds(req.user.id);

        // Devolver el resultado(posteriormente info follow)
        return res.status(200).send({
            status:"success",
            users,
            page,
            itemsPerPage,
            total:totalUsers,
            pages:Math.ceil(totalUsers/itemsPerPage),
            user_following:(followUserId).following,
            user_follow_me:(followUserId).followers
        })
    }).catch((error)=>{
        return res.status(404).send({
            status: "error",
            message: "No hay usuarios disponibles",
            error
        })
    })
}

const update = (req,res)=>{
    // Recoger info del usuario a actualizar
    let userIdentity = req.user;
    let userToUpdate = req.body;

    // Eliminar campos sobrantes
    delete userToUpdate.iat;
    delete userToUpdate.exp;
    delete userToUpdate.role;
    delete userToUpdate.image;

    console.log(userIdentity)
    console.log(userToUpdate)
    // Comprobar si el usuario ya existe
    User.find({ 
        $or:[
        {email: userToUpdate.email.toLowerCase()},
        {nick: userToUpdate.nick.toLowerCase()}

    ]
    }).then(async (users)=>{

        let userIsset = false;
        users.forEach(user => {
            if(user && user._id != userIdentity.id){
                userIsset = true;
            }
        })

        if(userIsset){

            return res.status(200).send({
                status: "success",
                message: "El usuario ya existe"
            });
            
        }
        
        // Cifrar la contraseña
        if(userToUpdate.password){
            let pwd = await bcrypt.hash(userToUpdate.password,10)
            userToUpdate.password = pwd;
        }else{
            delete userToUpdate.password;
        }

        // Buscar y actualizar
        User.findByIdAndUpdate(userIdentity.id, userToUpdate, {new:true}).then((userUpdated)=>{
            return res.status(200).send({
                status:"success",
                message: "Metodo de actualizar usuario",
                user:userUpdated,
            })
        }).catch((error)=>{
            return res.status(401).json({status:"error",message:"Error al actualizar usuarios",error})
        })
    }).catch((error)=>{
        return res.status(500).json({status:"error",message:"Error en la consulta de usuarios",error})
    })
}

const upload = (req,res) =>{

    // Recoger el fichero de imagen y comprobar que existe
    if(!req.file){
        return res.status(404).send({
            status:"Error",
            message:"Error en el archivo"
        })
    }
    // Conseguir el nombre del archivo
    let image = req.file.originalname;

    // Sacar la extension del archivo
    const imageSplit = image.split("\.");
    const ext = imageSplit[1];

    // Comprobar extension 
    if(ext!="png" && ext!="jpg" && ext!="jpeg" && ext!="gif"){
        
        // Si no es correcto, borrar archivo
        const filePath=req.file.path;
        const fileDeleted = fs.unlinkSync(filePath);

        // Devolver respuesta de error
        return res.status(404).send({
            status:"Error",
            message:"Extension del archivo invalida"
        })
    }
    console.log(req.user)
    // Si es correcto, guardar imagen en bd
    User.findByIdAndUpdate(req.user.id,{image: req.file.filename},{new:true})
    .then((userU)=>{
        // Devolver respuesta
        return res.status(200).send({
            status:"Success",
            user: userU,
            file:req.file,
    })
    }).catch((error)=>{
         // Devolver respuesta de error
         return res.status(404).send({
            status:"Error",
            message:"error en la consulta",
            error:error
        })
    })
}

const avatar = (req,res)=>{

    // sacar parametro url
    const file = req.params.file;

    // montar el path real de la imagen
    const filePath = "./uploads/avatars/"+file;
    console.log(file)
    console.log(filePath)
    // Comprobar existencia del archivo
    fs.stat(filePath,(error,existe)=>{
        if(!existe) {
            return res.status(404).send({
                status:"Error", 
                message:"No existe el fichero",
                error
            });
        }
        // Devolver un file
    return res.sendFile(path.resolve(filePath));
    });

} 

const counters = async (req,res)=>{

    let userId = req.user.id;

    if(req.params.id){
        userId = req.params.id
    }

    try {
        const following = await follow.count({"user":userId});

        const followed = await follow.count({"followed":userId});

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
    pruebaUser,register,login,profile,list,update,upload,avatar,counters
}