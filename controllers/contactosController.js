// contactosController.js
const ContactosModel = require('../models/contactosModel');

class ContactosController {
    async add(req, res) {
        try {
            const { nombre, email, comentario } = req.body;
            const ip = req.ip || req.headers['x-forwarded-for'] || req.connection.remoteAddress;

            if (!nombre || !email || !comentario) {
                return res.status(400).send('Todos los campos son obligatorios.');
            }

            await ContactosModel.insertarContacto({ nombre, email, comentario, ip });

        } catch (err) {
            console.error('Error al insertar contacto:', err);
            res.status(500).send('Error interno del servidor.');
        }
    }
}

module.exports = new ContactosController();
