// Importar modulos
const fs = require("fs");
const path = require("path");
// Importar modelos
const publication = require("../models/publication");
// Importar dependencia
const mongoosePaginate = require("mongoose-pagination");
// Importar servicios
const followService = require("../services/followService")

// Acciones de prueba
const pruebaPublication = (req, res) => {
    res.status(200).send({
        message: "Mensaje enviado desde: controlers/publication.js"
    });
}

// Guardar publication
const save = (req, res) => {
    // Recoger datos del body
    const params = req.body;
    // Si no llega dar respuesta negativa
    if (!params.text) { return res.status(401).send({ status: "Error", message: "Error en los parámetros enviados" }) }
    // Crear y rellenar el objeto del modelo
    let newPublication = new publication(params);
    newPublication.user = req.user.id;
    // Guardar objeto en BD
    newPublication.save().then((publicationStored) => {
        // Devolver respuesta
        return res.status(200).send({
            status: "success",
            message: "Se ha guardado la publicación",
            publicationStored
        })
    }).catch((error) => {
        // Devolver respuesta de error en la consulta
        return res.status(403).send({
            status: "Error",
            message: "Error al guardar publicación",
            error: error
        })
    })

}

// Sacar una publication
const detail = (req, res) => {
    // Sacar id de publicacion de la url
    const publicationId = req.params.id;

    publication.findOne({ _id: publicationId }).then((publication) => {
        return res.status(200).send({
            status: "Success",
            message: "Detalle publicación",
            publication: publication
        })
    }).catch((error) => {
        return res.status(403).send({
            status: "Error",
            message: "Error al obtener la publicación",
            error: error
        })
    })

}
// Eliminar publication
const remove = (req, res) => {
    // Sacar id de la publicacion a eliminar
    const publicationId = req.params.id;

    // Find y luego remove
    publication.find({ "user": req.user.id, "_id": publicationId }).deleteOne().then((publication) => {
        if (publication.deletedCount == 0) {
            return res.status(500).send({
                status: "Error",
                message: "Error al obtener la publicación",
                error: "La publicacion no existe"
            })
        }
        return res.status(200).send({
            status: "Success",
            message: "Eliminar publicación",
            publication: publication
        })

    }).catch((error) => {
        return res.status(403).send({
            status: "Error",
            message: "Error al obtener la publicación",
            error: error
        })
    })
}
// Listar publicacion de usuario (Feed)
const user = (req, res) => {
    // Sacar id usuario
    const userId = req.params.id;

    // Controlar la pagina
    let page = 1

    if (req.params.page) page = parseInt(req.params.page);

    let itemsPerPage = 5;

    // Find, populate, ordenar, pagina
    publication.find({ user: userId })
        .sort("-created_at")
        .populate("user", "-password -__v -email -role -bio")
        .select("-__v")
        .paginate(page, itemsPerPage)
        .then(async (publications) => {

            // Extraer total de publicaciones 
            const total = await publication.countDocuments({ user: userId }).exec();

            // Comprobar que existan publicaciones
            if (total == 0 || !publications) {
                return res.status(403).send({
                    status: "Error",
                    message: "No existen publicaciones"
                })
            }

            return res.status(200).send({
                status: "Success",
                message: "Detalle publicación",
                totalPublicaciones: total,
                page: page,
                pages: Math.ceil(total / itemsPerPage),
                total,
                publications: publications
            })
        }).catch((error) => {
            return res.status(403).send({
                status: "Error",
                message: "Error al obtener la publicación",
                error: error
            })
        })

}
// Subir ficheros
const upload = (req, res) => {

    // Sacar publication id
    const publicationId = req.params.id;

    // Recoger el fichero de imagen y comprobar que existe
    if (!req.file) {
        return res.status(404).send({
            status: "Error",
            message: "Error en el archivo"
        })
    }
    // Conseguir el nombre del archivo
    let image = req.file.originalname;

    // Sacar la extension del archivo
    const imageSplit = image.split("\.");
    const ext = imageSplit[1];

    // Comprobar extension 
    if (ext != "png" && ext != "jpg" && ext != "jpeg" && ext != "gif") {

        // Si no es correcto, borrar archivo
        const filePath = req.file.path;
        const fileDeleted = fs.unlinkSync(filePath);

        // Devolver respuesta de error
        return res.status(404).send({
            status: "Error",
            message: "Extension del archivo invalida"
        })
    }
    console.log(req.user)
    // Si es correcto, guardar imagen en bd
    publication.findByIdAndUpdate({ "user": req.user.id, "_id": publicationId }, { file: req.file.filename }, { new: true })
        .then((publicationU) => {
            // Devolver respuesta
            return res.status(200).send({
                status: "Success",
                publication: publicationU,
                file: req.file,
            })
        }).catch((error) => {
            // Devolver respuesta de error
            return res.status(404).send({
                status: "Error",
                message: "error en la consulta",
                error: error
            })
        })
}

// Devolver archivos multimedia imagenes
const media = (req, res) => {

    // sacar parametro url
    const file = req.params.file;

    // montar el path real de la imagen
    const filePath = "./uploads/publications/" + file;
    console.log(file)
    console.log(filePath)
    // Comprobar existencia del archivo
    fs.stat(filePath, (error, existe) => {
        if (!existe) {
            return res.status(404).send({
                status: "Error",
                message: "No existe el fichero",
                error
            });
        }
        // Devolver un file
        return res.sendFile(path.resolve(filePath));
    });

}


// Listar todas las publication
const feed = async (req, res) => {


    // Sacar la pagina actual
    let page = 1
    if (req.params.page) { page = req.params.page; }

    // Establecer numero de elementos por pagina
    const itemsPerPage = 5;

    // Sacar un array de identificadores de usuarios que yo sigo como usuario identificado 
    try {
        const myFollows = await followService.followUserIds(req.user.id);
        // Find a publicaciones con el metodo in, ordenar, popular, paginar
        publication.find({
            user: myFollows.following
        })
            .paginate(page, itemsPerPage)
            .populate("user", "-password -role -__v -email -created_at -bio -_id")
            .select("-__v")
            .sort("-created_at")
            .then(async (publications) => {
                // Extraer total de publicaciones 
                const total = await publication.countDocuments({ user: myFollows.following }).exec();

                // Comprobar que existan publicaciones
                if (total == 0 || !publications) {
                    return res.status(403).send({
                        status: "Error",
                        message: "No existen publicaciones"
                    })
                }
                return res.status(200).send({
                    status: "Success",
                    message: "feed de publicaciones",
                    total: total,
                    page: page,
                    totalPaginas: Math.ceil(total / itemsPerPage),
                    followings: myFollows.following,
                    publications
                })
            }).catch((error) => {
                return res.status(403).send({
                    status: "Error",
                    message: "Error al obtener la publicación",
                    error: error
                })
            })
    } catch (error) {
        return res.status(500).send({
            status: "Error",
            message: "Error al no se han listado las publicaciones",
            error: error
        })
    }



}
// Exportar acciones
module.exports = {
    pruebaPublication, save, detail, feed, user, remove, upload, media
}