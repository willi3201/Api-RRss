// Importar dependencias
const {connection} = require("./database/connection");
const express = require("express");
const cors = require("cors");

// Mensaje bienvenida
console.log("api red social arrancada")

// Conexion a bbdd
connection();

// Crear servidor node
const app = express();
const puerto = 3900;

// Configurar cors
app.use(cors());

// Convertir los datos del body a objetos js
app.use(express.json());
app.use(express.urlencoded({extends: true}));

// Cargar conf rutas
const userRoutes = require("./routes/user");
const publicationRoutes = require("./routes/publication");
const followRoutes = require("./routes/follow");


app.use("/api/user", userRoutes);
app.use("/api/publication", publicationRoutes);
app.use("/api/follow", followRoutes);
// Ruta de prueba
app.get("/ruta-prueba",(req,res) => {
    return res.status(200).json({
        "id":1,
        "nombre":"Williams",
        "web":"williamsWeb.cl"
    })
});

// Poner servidor a escuchar peticiones http
app.listen(puerto, ()=>{
    console.log("Servidor de node corriendo en el puerto: "+puerto)
})