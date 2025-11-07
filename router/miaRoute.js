const express = require('express');

const {
    getMias,
    getMia,
    createMia,
    updateMia,
    deleteMia,
} = require('../controllers/miaService');

const authService = require('../controllers/authService');

const router = express.Router();

router
    .route('/')
    .get(getMias)
    .post(
        authService.protect,
        authService.allowedTo('admin', 'manager'),
        createMia
    );

router
    .route('/:id')
    .get(getMia)
    .put(
        authService.protect,
        authService.allowedTo('admin', 'manager'),
        updateMia
    )
    .delete(
        authService.protect,
        authService.allowedTo('admin'),
        deleteMia
    );

module.exports = router;
